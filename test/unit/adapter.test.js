import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter, once } from 'node:events';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import vm from 'node:vm';
import { createCucumberPreprocessor, setupCucumber } from '../../adapter/index.js';

const feature = `Feature: unit
  @smoke
  Scenario: first
    Given step

  @retries(2) @viewportWidth(800) @unknownOption(1)
  Scenario: second
    When step
`;

const focusedFeature = `Feature: focus
  @only
  Scenario: focused
    Given step

  @skip
  Scenario: skipped
    Given step

  Scenario: regular
    Given step
`;

let dir;
before(() => {
    dir = mkdtempSync(join(tmpdir(), 'cypress-runner-adapter-'));
    writeFileSync(join(dir, 'test.feature'), feature);
    writeFileSync(join(dir, 'focus.feature'), focusedFeature);
    writeFileSync(
        join(dir, 'broken.feature'),
        'Feature: broken\n  Scenario: a\n    Given step\nFeature: second feature\n'
    );
});
after(() => rmSync(dir, { recursive: true, force: true }));

async function preprocess(options, name = 'test.feature') {
    const file = { filePath: join(dir, name), outputPath: join(dir, 'out', name + '.js'), shouldWatch: false };
    const outputPath = await createCucumberPreprocessor(options)(file);
    return readFileSync(outputPath, 'utf-8');
}

// evaluate generated spec and collect registered mocha suites and tests
function register(source) {
    const registered = [];
    const supportCodeLibrary = {
        stepDefinitions: [],
        beforeTestCaseHookDefinitions: [],
        afterTestCaseHookDefinitions: [],
        beforeTestStepHookDefinitions: [],
        afterTestStepHookDefinitions: [],
        beforeTestRunHookDefinitions: [],
        afterTestRunHookDefinitions: [],
        World: class {}
    };
    const noop = () => {};
    const mochaFn = (type, focus) => (title, config, fn) => {
        registered.push({ type, title, config, focus });
        if (type === 'describe') (fn ?? config)();
    };
    const describe = Object.assign(mochaFn('describe'), {
        only: mochaFn('describe', 'only'),
        skip: mochaFn('describe', 'skip')
    });
    const it = Object.assign(mochaFn('it'), { only: mochaFn('it', 'only'), skip: mochaFn('it', 'skip') });
    vm.runInNewContext(source, {
        window: { supportCodeLibrary },
        Cypress: { config: () => ({ retries: 0, viewportWidth: 1000 }) },
        describe,
        it,
        before: noop,
        after: noop,
        beforeEach: noop,
        afterEach: noop
    });
    return registered;
}

const titles = registered => registered.map(({ title }) => title);

test('describe mode registers suite per scenario', async () => {
    assert.deepEqual(titles(register(await preprocess({ mode: 'describe' }))), [
        'Scenario: first',
        'Given step',
        'Scenario: second',
        'When step'
    ]);
});

test('it mode registers test per scenario', async () => {
    assert.deepEqual(titles(register(await preprocess({ mode: 'it' }))), ['Scenario: first', 'Scenario: second']);
});

test('filters scenarios by tags', async () => {
    assert.deepEqual(titles(register(await preprocess({ mode: 'it', tags: 'not @smoke' }))), ['Scenario: second']);
});

test('passes gherkin document with relative uri to runtime', async () => {
    const source = await preprocess({ mode: 'it' });
    assert.match(source, /"feature":\{[^]*"name":"unit"/);
    assert.doesNotMatch(source, /"uri":"\//);
});

test('applies cypress config tags', async () => {
    const [, second] = register(await preprocess({ mode: 'it' }));
    assert.deepEqual({ ...second.config }, { retries: 2, viewportWidth: 800 });
    const describeSuite = register(await preprocess({ mode: 'describe' })).find(
        ({ title }) => title === 'Scenario: second'
    );
    assert.deepEqual({ ...describeSuite.config }, { testIsolation: false, retries: 2, viewportWidth: 800 });
});

test('maps @only and @skip tags', async () => {
    for (const [mode, type] of [
        ['it', 'it'],
        ['describe', 'describe']
    ]) {
        const scenarios = register(await preprocess({ mode }, 'focus.feature')).filter(item => item.type === type);
        assert.deepEqual(
            scenarios.map(({ focus }) => focus),
            ['only', 'skip', undefined]
        );
    }
});

test('reports feature file on parse error', async () => {
    await assert.rejects(preprocess({}, 'broken.feature'), /Failed to parse .*broken\.feature/);
});

test('rejects unknown mode', async () => {
    await assert.rejects(preprocess({ mode: 'scenario' }), /Unknown mode 'scenario'/);
});

test('emits rerun when watched feature file changes', async () => {
    const file = Object.assign(new EventEmitter(), {
        filePath: join(dir, 'test.feature'),
        outputPath: join(dir, 'out', 'watched.js'),
        shouldWatch: true
    });
    await createCucumberPreprocessor()(file);
    const rerun = once(file, 'rerun');
    writeFileSync(file.filePath, feature + '\n');
    await rerun;
    file.emit('close');
});

test('setupCucumber excludes features without matching scenarios but keeps broken ones', () => {
    const events = {};
    const config = setupCucumber(
        (event, handler) => {
            events[event] = handler;
        },
        { projectRoot: dir, specPattern: '*.feature', excludeSpecPattern: '*.hot-update.js', env: { TAGS: '@smoke' } },
        { tags: undefined }
    );
    assert.equal(typeof events['file:preprocessor'], 'function');
    assert.deepEqual(config.excludeSpecPattern.sort(), ['*.hot-update.js', 'focus.feature'].sort());
});

test('setupCucumber registers messages writer', () => {
    const events = {};
    setupCucumber(
        (event, handler) => {
            events[event] = handler;
        },
        { projectRoot: dir, env: {} },
        { messages: 'out/messages.ndjson' }
    );
    assert.ok(events.task['qavajs:cucumber:messages']);
    events.task['qavajs:cucumber:messages']({ envelopes: [{ pickle: { id: '1' } }], success: true });
    events['after:run']();
    const envelopes = readFileSync(join(dir, 'out/messages.ndjson'), 'utf-8')
        .trim()
        .split('\n')
        .map(line => JSON.parse(line));
    assert.deepEqual(
        envelopes.map(envelope => Object.keys(envelope)[0]),
        ['meta', 'testRunStarted', 'pickle', 'testRunFinished']
    );
    assert.equal(envelopes[3].testRunFinished.success, true);
});
