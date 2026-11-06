import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, watch, writeFileSync, globSync } from 'node:fs';
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
const SCENARIO_EXT = '.scenario';
const DEFAULT_SCENARIO_SPECS_DIR = 'cypress/scenarios';
// spec of a feature that cannot be parsed, reports parse error when opened
const PARSE_ERROR_SPEC = `(parse error)${SCENARIO_EXT}`;

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

function toArray(value) {
    if (value === undefined || value === null || value === false) return [];
    return Array.isArray(value) ? value : [value];
}

const watchers = new Map();

/**
 * Rerun spec when feature file changes
 * @param {Cypress.FileObject} file - spec file
 * @param {string} [featurePath] - feature file of spec (default: spec file itself)
 */
function watchFeature(file, featurePath = file.filePath) {
    const { filePath } = file;
    if (!file.shouldWatch || watchers.has(filePath)) return;
    let timer;
    // watch the directory to survive editors that save via rename
    const watcher = watch(dirname(featurePath), (event, fileName) => {
        if (fileName !== basename(featurePath)) return;
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

// characters not allowed in file names or special in Cypress spec globs and urls
// oxlint-disable-next-line no-control-regex
const UNSAFE_FILE_NAME_CHARS = /[\\/:*?"<>|()[\]{}!+@,#%&\x00-\x1f]/g;

function scenarioFileName(name) {
    return name.replace(UNSAFE_FILE_NAME_CHARS, '_').trim().slice(0, 120) || 'scenario';
}

/**
 * Spec file name of each pickle; duplicate names (e.g. outline rows without placeholders in title) are numbered
 * @param {object[]} pickles
 * @returns {{ fileName: string, pickle: object }[]}
 */
export function scenarioSpecs(pickles) {
    const names = pickles.map(pickle => scenarioFileName(pickle.name));
    const counts = new Map();
    for (const name of names) counts.set(name, (counts.get(name) ?? 0) + 1);
    const seen = new Map();
    return pickles.map((pickle, i) => {
        const name = names[i];
        const occurrence = (seen.get(name) ?? 0) + 1;
        seen.set(name, occurrence);
        const suffix = counts.get(name) > 1 ? ` - ${occurrence}` : '';
        return { fileName: `${name}${suffix}${SCENARIO_EXT}`, pickle };
    });
}

/**
 * Write spec file per scenario of feature into `<outDir>/<feature uri>/` and remove stale ones.
 * Spec file contains feature uri, scenario is identified by file name.
 * @param {string} featurePath - absolute path of .feature file
 * @param {object} options
 * @param {string} options.outDir - absolute path of scenario specs directory
 * @param {string} options.tags - tag expression to filter scenarios
 * @param {string} options.projectRoot - root that feature uri is relative to
 * @returns {string[]} spec file names
 */
export function writeScenarioSpecs(featurePath, { outDir, tags, projectRoot }) {
    const uri = relative(projectRoot, featurePath);
    const dir = join(outDir, uri);
    let files = [];
    if (existsSync(featurePath)) {
        try {
            files = scenarioSpecs(loadFeature(featurePath, tags, projectRoot).pickles).map(({ fileName }) => fileName);
        } catch {
            files = [PARSE_ERROR_SPEC];
        }
    }
    const existing = existsSync(dir) ? readdirSync(dir).filter(file => file.endsWith(SCENARIO_EXT)) : [];
    for (const file of existing) {
        if (!files.includes(file)) rmSync(join(dir, file), { force: true });
    }
    if (files.length > 0) mkdirSync(dir, { recursive: true });
    const content = JSON.stringify({ feature: uri }) + '\n';
    // keep existing files untouched so the opened spec is not rerun
    for (const file of files) {
        if (!existing.includes(file)) writeFileSync(join(dir, file), content, 'utf-8');
    }
    return files;
}

/**
 * Generate scenario specs for feature files and keep them in sync with features
 * @returns {string} glob of scenario specs relative to project root
 */
function setupScenarioSpecs(features, { outDir, tags, projectRoot }) {
    for (const file of globSync(`**/*${SCENARIO_EXT}`, { cwd: outDir })) {
        rmSync(join(outDir, file), { force: true });
    }
    for (const feature of features) writeScenarioSpecs(feature, { outDir, tags, projectRoot });
    const timers = new Map();
    for (const dir of new Set(features.map(feature => dirname(feature)))) {
        watch(dir, (event, fileName) => {
            if (!fileName?.endsWith('.feature')) return;
            const featurePath = join(dir, fileName);
            clearTimeout(timers.get(featurePath));
            timers.set(
                featurePath,
                setTimeout(() => writeScenarioSpecs(featurePath, { outDir, tags, projectRoot }), 100)
            );
        }).unref();
    }
    return `${relative(projectRoot, outDir).split('\\').join('/')}/**/*${SCENARIO_EXT}`;
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
        if (!filePath.endsWith('.feature') && !filePath.endsWith(SCENARIO_EXT)) {
            return webpackPreprocessor(file);
        }
        const mode = options.mode ?? process.env.MODE ?? 'describe';
        if (!MODES.includes(mode)) {
            throw new Error(`Unknown mode '${mode}'. Expected one of: ${MODES.join(', ')}`);
        }
        const tags = options.tags ?? process.env.TAGS ?? '';
        let feature;
        let featurePath = filePath;
        if (filePath.endsWith(SCENARIO_EXT)) {
            const projectRoot = options.projectRoot ?? process.cwd();
            const { feature: uri } = JSON.parse(readFileSync(filePath, 'utf-8'));
            featurePath = resolve(projectRoot, uri);
            feature = loadFeature(featurePath, tags, projectRoot);
            const spec = scenarioSpecs(feature.pickles).find(({ fileName }) => fileName === basename(filePath));
            if (!spec) {
                throw new Error(`Scenario '${basename(filePath, SCENARIO_EXT)}' is not found in ${uri}`);
            }
            feature.pickles = [spec.pickle];
        } else {
            feature = loadFeature(filePath, tags, options.projectRoot);
        }
        mkdirSync(dirname(outputPath), { recursive: true });
        writeFileSync(outputPath, adapter(feature, { mode, messages: Boolean(options.messages) }), 'utf-8');
        watchFeature(file, featurePath);
        return outputPath;
    };
}

function featureFiles(config) {
    const projectRoot = config.projectRoot ?? process.cwd();
    return globSync(toArray(config.specPattern), { cwd: projectRoot }).filter(file => file.endsWith('.feature'));
}

/**
 * Feature files matched by spec pattern that have no scenarios matching tag expression
 * @returns {string[]} paths relative to project root
 */
export function featuresWithoutMatchingScenarios(config, tags) {
    const projectRoot = config.projectRoot ?? process.cwd();
    return featureFiles(config).filter(file => {
        try {
            return loadFeature(resolve(projectRoot, file), tags, projectRoot).pickles.length === 0;
        } catch {
            // keep unparsable features so preprocessor reports the error
            return false;
        }
    });
}

/**
 * Normalize scenarioSpecs value from option or env variable: 'true'/'1' enable default directory,
 * 'false'/'0'/'' disable, any other string is a directory
 * @param {boolean | string | undefined} value
 * @returns {boolean | string}
 */
function parseScenarioSpecs(value) {
    if (typeof value !== 'string') return Boolean(value);
    const normalized = value.trim();
    if (['', 'false', '0'].includes(normalized.toLowerCase())) return false;
    if (['true', '1'].includes(normalized.toLowerCase())) return true;
    return normalized;
}

/**
 * Register preprocessor, exclude feature files without matching scenarios and optionally write cucumber messages
 * @param {Cypress.PluginEvents} on
 * @param {Cypress.PluginConfigOptions} config
 * @param {object} [options]
 * @param {'describe' | 'it'} [options.mode] - translation mode (default: MODE env variable or 'describe')
 * @param {string} [options.tags] - tag expression (default: TAGS Cypress env, then TAGS env variable)
 * @param {string} [options.messages] - path of cucumber messages .ndjson report relative to project root
 * @param {boolean | string} [options.scenarioSpecs] - in `cypress open`, list each scenario as a separate spec;
 * string sets directory of generated specs relative to project root (default: cypress/scenarios);
 * defaults to SCENARIO_SPECS Cypress env, then SCENARIO_SPECS env variable
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
    const scenarioSpecs = parseScenarioSpecs(
        options.scenarioSpecs ?? config.env?.SCENARIO_SPECS ?? process.env.SCENARIO_SPECS
    );
    if (scenarioSpecs && config.isInteractive) {
        const dir = typeof scenarioSpecs === 'string' ? scenarioSpecs : DEFAULT_SCENARIO_SPECS_DIR;
        const features = featureFiles(config).map(file => resolve(projectRoot, file));
        const pattern = setupScenarioSpecs(features, { outDir: resolve(projectRoot, dir), tags, projectRoot });
        config.specPattern = [...toArray(config.specPattern), pattern];
        config.excludeSpecPattern = [...toArray(config.excludeSpecPattern), '**/*.feature'];
        return config;
    }
    if (tags) {
        config.excludeSpecPattern = [
            ...toArray(config.excludeSpecPattern),
            ...featuresWithoutMatchingScenarios(config, tags)
        ];
    }
    return config;
}

export default createCucumberPreprocessor();
