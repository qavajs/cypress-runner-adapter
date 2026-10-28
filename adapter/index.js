import { mkdirSync, writeFileSync, readFileSync, watch, globSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { AstBuilder, compile, GherkinClassicTokenMatcher, Parser } from '@cucumber/gherkin';
import createWebpackPreprocessor from '@cypress/webpack-preprocessor';
import { parse as tagExpressionParser } from '@cucumber/tag-expressions';
import { buildSync } from 'esbuild';
import { registerMessagesWriter } from './messages.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MODES = ['describe', 'it'];

const webpackPreprocessor = createWebpackPreprocessor({
    webpackOptions: {
        mode: 'development',
        resolve: { extensions: ['.ts', '.js'] },
        module: {
            rules: [
                {
                    test: /\.[jt]sx?$/,
                    exclude: [/node_modules/],
                    use: [{ loader: 'esbuild-loader', options: { target: 'es2020' } }]
                }
            ]
        }
    }
});

const uuidFn = () => randomUUID();

let runtimeSource;

/**
 * Browser runtime that translates pickles to mocha tests, bundled once per process
 */
function getRuntimeSource() {
    runtimeSource ??= buildSync({
        entryPoints: [join(__dirname, '../runtime/index.js')],
        bundle: true,
        write: false,
        format: 'iife',
        globalName: '__qavajsRuntime',
        platform: 'browser',
        target: 'es2020'
    }).outputFiles[0].text;
    return runtimeSource;
}

/**
 * Parse feature file and compile its pickles
 * @param {string} filePath - absolute path of .feature file
 * @param {string} [tags] - tag expression to filter pickles
 * @param {string} [projectRoot] - root that feature uri is relative to
 */
export function loadFeature(filePath, tags = '', projectRoot = process.cwd()) {
    const uri = relative(projectRoot, filePath);
    const source = readFileSync(filePath, 'utf-8');
    const parser = new Parser(new AstBuilder(uuidFn), new GherkinClassicTokenMatcher());
    let gherkinDocument;
    try {
        gherkinDocument = parser.parse(source);
    } catch (error) {
        error.message = `Failed to parse ${uri}\n${error.message}`;
        throw error;
    }
    gherkinDocument.uri = uri;
    const tagExpression = tagExpressionParser(tags);
    const pickles = compile(gherkinDocument, uri, uuidFn).filter(pickle =>
        tagExpression.evaluate(pickle.tags.map(tag => tag.name))
    );
    return { source, gherkinDocument, pickles };
}

function adapter({ source, gherkinDocument, pickles }, { mode, messages }) {
    const options = { mode, messages, source: messages ? source : '' };
    return (
        `(function () {\n${getRuntimeSource()}\n` +
        `__qavajsRuntime.run(${JSON.stringify(gherkinDocument)}, ${JSON.stringify(pickles)}, ${JSON.stringify(options)});\n` +
        `})();\n`
    );
}

const watchers = new Map();

function watchFeature(file) {
    const { filePath } = file;
    if (!file.shouldWatch || watchers.has(filePath)) return;
    let timer;
    // watch the directory to survive editors that save via rename
    const watcher = watch(dirname(filePath), (event, fileName) => {
        if (fileName !== basename(filePath)) return;
        clearTimeout(timer);
        timer = setTimeout(() => file.emit('rerun'), 100);
    });
    watchers.set(filePath, watcher);
    file.on('close', () => {
        clearTimeout(timer);
        watcher.close();
        watchers.delete(filePath);
    });
}

/**
 * Create Cypress file preprocessor that compiles .feature files and bundles other files with webpack
 * @param {object} [options]
 * @param {'describe' | 'it'} [options.mode] - translation mode (default: MODE env variable or 'describe')
 * @param {string} [options.tags] - tag expression to filter scenarios (default: TAGS env variable)
 * @param {boolean} [options.messages] - record cucumber messages (requires `setupCucumber` with `messages` option)
 * @param {string} [options.projectRoot] - root that feature uris are relative to (default: current working directory)
 */
export function createCucumberPreprocessor(options = {}) {
    return async function cucumber(file) {
        const { filePath, outputPath } = file;
        if (!filePath.endsWith('.feature')) {
            return webpackPreprocessor(file);
        }
        const mode = options.mode ?? process.env.MODE ?? 'describe';
        if (!MODES.includes(mode)) {
            throw new Error(`Unknown mode '${mode}'. Expected one of: ${MODES.join(', ')}`);
        }
        const feature = loadFeature(filePath, options.tags ?? process.env.TAGS ?? '', options.projectRoot);
        mkdirSync(dirname(outputPath), { recursive: true });
        writeFileSync(outputPath, adapter(feature, { mode, messages: Boolean(options.messages) }), 'utf-8');
        watchFeature(file);
        return outputPath;
    };
}

function toArray(value) {
    if (value === undefined || value === null || value === false) return [];
    return Array.isArray(value) ? value : [value];
}

/**
 * Feature files matched by spec pattern that have no scenarios matching tag expression
 * @returns {string[]} paths relative to project root
 */
export function featuresWithoutMatchingScenarios(config, tags) {
    const projectRoot = config.projectRoot ?? process.cwd();
    const files = globSync(toArray(config.specPattern), { cwd: projectRoot });
    return files
        .filter(file => file.endsWith('.feature'))
        .filter(file => {
            try {
                return loadFeature(resolve(projectRoot, file), tags, projectRoot).pickles.length === 0;
            } catch {
                // keep unparsable features so preprocessor reports the error
                return false;
            }
        });
}

/**
 * Register preprocessor, exclude feature files without matching scenarios and optionally write cucumber messages
 * @param {Cypress.PluginEvents} on
 * @param {Cypress.PluginConfigOptions} config
 * @param {object} [options]
 * @param {'describe' | 'it'} [options.mode] - translation mode (default: MODE env variable or 'describe')
 * @param {string} [options.tags] - tag expression (default: TAGS Cypress env, then TAGS env variable)
 * @param {string} [options.messages] - path of cucumber messages .ndjson report relative to project root
 * @returns {Cypress.PluginConfigOptions}
 */
export function setupCucumber(on, config, options = {}) {
    const tags = options.tags ?? config.env?.TAGS ?? process.env.TAGS ?? '';
    const projectRoot = config.projectRoot ?? process.cwd();
    if (options.messages) {
        registerMessagesWriter(on, resolve(projectRoot, options.messages));
    }
    on(
        'file:preprocessor',
        createCucumberPreprocessor({
            mode: options.mode,
            tags,
            messages: Boolean(options.messages),
            projectRoot
        })
    );
    if (tags) {
        config.excludeSpecPattern = [
            ...toArray(config.excludeSpecPattern),
            ...featuresWithoutMatchingScenarios(config, tags)
        ];
    }
    return config;
}

export default createCucumberPreprocessor();
