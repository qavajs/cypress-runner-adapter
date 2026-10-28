import { test } from 'node:test';
import assert from 'node:assert/strict';
import TestCaseHookDefinition from '../../supportCodeLibrary/test_case_hook_definition.js';
import TestStepHookDefinition from '../../supportCodeLibrary/test_step_hook_definition.js';

const pickle = (...tags) => ({ tags: tags.map(name => ({ name })) });

test('hook without tags applies to every test case', () => {
    const hook = new TestCaseHookDefinition({ code() {}, options: {} });
    assert.equal(hook.appliesToTestCase(pickle()), true);
    assert.equal(hook.name, 'Hook');
});

test('test case hook filters by tag expression', () => {
    const hook = new TestCaseHookDefinition({ code() {}, options: { tags: '@smoke and not @slow', name: 'Before' } });
    assert.equal(hook.appliesToTestCase(pickle('@smoke')), true);
    assert.equal(hook.appliesToTestCase(pickle('@smoke', '@slow')), false);
    assert.equal(hook.name, 'Before');
});

test('test step hook filters by scenario tags', () => {
    const hook = new TestStepHookDefinition({ code() {}, options: { tags: '@tagged' } });
    assert.equal(hook.appliesToTestCase(pickle('@tagged')), true);
    assert.equal(hook.appliesToTestCase(pickle()), false);
});
