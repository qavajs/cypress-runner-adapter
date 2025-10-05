const { ensureFileSync, writeFileSync, readFileSync } = require('fs-extra');
const { randomUUID } = require('node:crypto');
const { AstBuilder, compile, GherkinClassicTokenMatcher, Parser } = require('@cucumber/gherkin');
const webpackPreprocessor = require('@cypress/webpack-preprocessor')();
const tagExpressionParser = require('@cucumber/tag-expressions').default;
const makeMochaTest = require('./make_mocha_tests');
const uuidFn = () => randomUUID();
const builder = new AstBuilder(uuidFn);
const matcher = new GherkinClassicTokenMatcher();
const parser = new Parser(builder, matcher);

function adapter(testCases) {
    return `(${makeMochaTest.toString()})(${JSON.stringify(testCases)});`;
}

module.exports = async function cucumber(file) {
    const { filePath, outputPath, shouldWatch } = file;
    if (!filePath.endsWith('.feature')) {
        return webpackPreprocessor(file);
    }
    const gherkinDocument = parser.parse(readFileSync(filePath, 'utf-8'));
    console.log(process.env.TAGS)
    const tagExpression = tagExpressionParser(process.env.TAGS || '');
    const testCases = compile(gherkinDocument, filePath, uuidFn)
        .filter(test => tagExpression.evaluate(test.tags.map(tag => tag.name)));
    ensureFileSync(outputPath);
    writeFileSync(outputPath, adapter(testCases), 'utf-8');
    return outputPath;
}
