import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CucumberExpression, ParameterTypeRegistry } from '@cucumber/cucumber-expressions';
import StepDefinition from '../../supportCodeLibrary/step_definition.js';
import DataTable from '../../supportCodeLibrary/data_table.js';

function stepDefinition(pattern) {
    return new StepDefinition({
        keyword: 'When',
        pattern,
        expression: new CucumberExpression(pattern, new ParameterTypeRegistry()),
        options: {},
        code() {}
    });
}

test('converts raw pickle data table argument to DataTable', () => {
    const step = stepDefinition('a step');
    const { parameters } = step.getInvocationParameters({
        step: { text: 'a step', argument: { dataTable: { rows: [{ cells: [{ value: 'a' }] }] } } },
        world: {}
    });
    assert.ok(parameters[0] instanceof DataTable);
    assert.deepEqual(parameters[0].raw(), [['a']]);
});

test('converts raw pickle doc string argument to its content', () => {
    const step = stepDefinition('a step');
    const { parameters } = step.getInvocationParameters({
        step: { text: 'a step', argument: { docString: { content: 'hello' } } },
        world: {}
    });
    assert.equal(parameters[0], 'hello');
});

test('passes a DataTable instance from World#executeStep through unchanged', () => {
    const step = stepDefinition('a step');
    const table = new DataTable([['a']]);
    const { parameters } = step.getInvocationParameters({
        step: { text: 'a step', argument: table },
        world: {}
    });
    assert.equal(parameters[0], table);
});

test('passes a plain string from World#executeStep through unchanged', () => {
    const step = stepDefinition('a step');
    const { parameters } = step.getInvocationParameters({
        step: { text: 'a step', argument: 'doc string' },
        world: {}
    });
    assert.equal(parameters[0], 'doc string');
});
