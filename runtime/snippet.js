import { CucumberExpressionGenerator } from '@cucumber/cucumber-expressions';

function escapeQuotes(source) {
    return source.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

/**
 * Generate a step definition snippet for an undefined step
 * @param {string} keyword - Given | When | Then
 * @param {string} text - step text
 * @param {Iterable<ParameterType>} parameterTypes - registered parameter types
 * @param {object} [argument] - pickle step argument (data table or doc string)
 * @returns {string}
 */
export function generateSnippet(keyword, text, parameterTypes, argument) {
    const generator = new CucumberExpressionGenerator(() => parameterTypes);
    const [expression] = generator.generateExpressions(text);
    const parameters = [...expression.parameterNames];
    if (argument?.dataTable) parameters.push('dataTable');
    if (argument?.docString) parameters.push('docString');
    return (
        `${keyword}('${escapeQuotes(expression.source)}', function (${parameters.join(', ')}) {\n` +
        `    // Write code here that turns the phrase above into concrete actions\n` +
        `    return 'pending';\n` +
        `});`
    );
}
