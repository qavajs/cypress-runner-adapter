// validates cucumber messages report produced by e2e run
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const path = process.argv[2] ?? 'test/reports/messages.ndjson';
const envelopes = readFileSync(path, 'utf-8')
    .trim()
    .split('\n')
    .map(line => JSON.parse(line));
const of = type => envelopes.filter(envelope => envelope[type]).map(envelope => envelope[type]);

assert.ok(envelopes[0].meta, 'first envelope is meta');
assert.ok(envelopes.at(-1).testRunFinished, 'last envelope is testRunFinished');

const pickles = new Set(of('pickle').map(({ id }) => id));
const definitions = new Set([...of('stepDefinition'), ...of('hook')].map(({ id }) => id));
const testCases = new Map(of('testCase').map(testCase => [testCase.id, testCase]));
for (const testCase of testCases.values()) {
    assert.ok(pickles.has(testCase.pickleId), `testCase ${testCase.id} references pickle`);
    for (const step of testCase.testSteps) {
        for (const id of step.hookId ? [step.hookId] : step.stepDefinitionIds) {
            assert.ok(definitions.has(id), `testStep ${step.id} references definition`);
        }
    }
}

const started = new Map(of('testCaseStarted').map(started => [started.id, started]));
const finished = new Set(of('testCaseFinished').map(({ testCaseStartedId }) => testCaseStartedId));
for (const testCaseStarted of started.values()) {
    assert.ok(testCases.has(testCaseStarted.testCaseId), 'testCaseStarted references testCase');
    assert.ok(finished.has(testCaseStarted.id), `testCaseStarted ${testCaseStarted.id} is finished`);
}

const stepsFinished = of('testStepFinished');
for (const { testCaseStartedId, testStepId } of [...of('testStepStarted'), ...stepsFinished, ...of('attachment')]) {
    const testCase = testCases.get(started.get(testCaseStartedId)?.testCaseId);
    assert.ok(
        testCase?.testSteps.some(({ id }) => id === testStepId),
        `step ${testStepId} belongs to its test case`
    );
}
for (const testCaseStarted of started.values()) {
    const testCase = testCases.get(testCaseStarted.testCaseId);
    const count = stepsFinished.filter(({ testCaseStartedId }) => testCaseStartedId === testCaseStarted.id).length;
    assert.equal(count, testCase.testSteps.length, `every step of ${testCaseStarted.id} is finished once`);
}

const statuses = {};
for (const { testStepResult } of stepsFinished)
    statuses[testStepResult.status] = (statuses[testStepResult.status] ?? 0) + 1;
console.log(`${path}: ${started.size} test case attempts, ${of('attachment').length} attachments, steps:`, statuses);
