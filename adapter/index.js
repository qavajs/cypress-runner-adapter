import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { AstBuilder, compile, GherkinClassicTokenMatcher, Parser } from '@cucumber/gherkin';
import createWebpackPreprocessor from '@cypress/webpack-preprocessor';
import { parse as tagExpressionParser } from '@cucumber/tag-expressions';

const __dirname = dirname(fileURLToPath(import.meta.url));

const webpackPreprocessor = createWebpackPreprocessor({
    webpackOptions: {
        mode: 'development',
        resolve: { extensions: ['.ts', '.js'] },
        module: {
            rules: [
                {
                    test: /\.tsx?$/,
                    exclude: [/node_modules/],
                    use: [{ loader: 'esbuild-loader', options: { target: 'es2020' } }]
                },
                {
                    test: /\.jsx?$/,
                    exclude: [/node_modules/],
                    use: [{ loader: 'babel-loader', options: { presets: ['@babel/preset-env'] } }]
                }
            ]
        }
    }
});

const uuidFn = () => randomUUID();
const builder = new AstBuilder(uuidFn);
const matcher = new GherkinClassicTokenMatcher();
const parser = new Parser(builder, matcher);

const modeFile = process.env.MODE === 'it' ? 'make_mocha_tests_it.js' : 'make_mocha_tests_describe.js';

function getMakeMochaTestSource() {
    const src = readFileSync(join(__dirname, modeFile), 'utf-8');
    return src.replace(/^export\s+default\s+/, '');
}

function adapter(testCases) {
    return `(${getMakeMochaTestSource()})(${JSON.stringify(testCases)});`;
}

export default async function cucumber(file) {
    const { filePath, outputPath } = file;
    if (!filePath.endsWith('.feature')) {
        return webpackPreprocessor(file);
    }
    const gherkinDocument = parser.parse(readFileSync(filePath, 'utf-8'));
    const tagExpression = tagExpressionParser(process.env.TAGS || '');
    const testCases = compile(gherkinDocument, filePath, uuidFn)
        .filter(test => tagExpression.evaluate(test.tags.map(tag => tag.name)));
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, adapter(testCases), 'utf-8');
    return outputPath;
}
