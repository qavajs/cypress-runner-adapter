import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { AstBuilder, compile, GherkinClassicTokenMatcher, Parser } from '@cucumber/gherkin';
import createWebpackPreprocessor from '@cypress/webpack-preprocessor';
import { parse as tagExpressionParser } from '@cucumber/tag-expressions';
import makeMochaTestDescribe from './make_mocha_tests_describe.js';
import makeMochaTestIt from './make_mocha_tests_it.js';

const webpackPreprocessor = createWebpackPreprocessor({
    webpackOptions: {
        mode: 'development',
        resolve: { extensions: ['.ts', '.js'] },
        module: {
            rules: [
                {
                    test: /\.tsx?$/,
                    exclude: [/node_modules/],
                    use: [{ loader: 'ts-loader', options: { transpileOnly: true } }]
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

const makeMochaTest = process.env.MODE === 'it' ? makeMochaTestIt : makeMochaTestDescribe;

function adapter(testCases) {
    return `(${makeMochaTest.toString()})(${JSON.stringify(testCases)});`;
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
