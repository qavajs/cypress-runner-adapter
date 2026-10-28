import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ParameterTypeRegistry } from '@cucumber/cucumber-expressions';
import { generateSnippet } from '../../runtime/snippet.js';

const { parameterTypes } = new ParameterTypeRegistry();

test('generates snippet with parameters', () => {
    const snippet = generateSnippet('When', 'I open "home" page 3 times', parameterTypes);
    assert.match(snippet, /^When\('I open \{string\} page \{int\} times', function \(string, int\) \{/);
    assert.match(snippet, /return 'pending';/);
});

test('adds data table and doc string parameters', () => {
    assert.match(generateSnippet('Given', 'a table', parameterTypes, { dataTable: {} }), /function \(dataTable\)/);
    assert.match(generateSnippet('Given', 'a text', parameterTypes, { docString: {} }), /function \(docString\)/);
});

test('escapes single quotes', () => {
    assert.match(generateSnippet('Then', "it's done", parameterTypes), /Then\('it\\'s done'/);
});
