import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter, once } from 'node:events';
import { mkdirSync, mkdtempSync, writeFileSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import vm from 'node:vm';
import { createCucumberPreprocessor, setupCucumber, writeScenarioSpecs } from '../../adapter/index.js';

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

const outlineFeature = `Feature: outline
  Scenario Outline: user <user>
    Given step

    Examples:
      | user  |
      | admin |
      | guest |

  Scenario Outline: same/name
    Given step

    Examples:
      | user  |
      | admin |
      | guest |
`;

let dir;
before(() => {
    dir = mkdtempSync(join(tmpdir(), 'cypress-runner-adapter-'));
    writeFileSync(join(dir, 'outline.feature'), outlineFeature);
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
    assert.deepEqual(config.excludeSpecPattern.sort(), ['*.hot-update.js', 'focus.feature', 'outline.feature'].sort());
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

function setupScenarioSpecs(config, options = {}) {
    return setupCucumber(() => {}, { projectRoot: dir, specPattern: '*.feature', env: {}, ...config }, options);
}

const scenarioSpecFiles = feature => readdirSync(join(dir, 'scenarios', feature)).sort();

test('setupCucumber lists scenario specs in interactive mode', () => {
    const config = setupScenarioSpecs({ isInteractive: true }, { scenarioSpecs: 'scenarios' });
    assert.deepEqual(config.specPattern, ['*.feature', 'scenarios/**/*.scenario']);
    assert.deepEqual(config.excludeSpecPattern, ['**/*.feature']);
    assert.deepEqual(scenarioSpecFiles('outline.feature'), [
        'same_name - 1.scenario',
        'same_name - 2.scenario',
        'user admin.scenario',
        'user guest.scenario'
    ]);
    assert.deepEqual(scenarioSpecFiles('test.feature'), ['first.scenario', 'second.scenario']);
    assert.deepEqual(scenarioSpecFiles('broken.feature'), ['(parse error).scenario']);
    assert.deepEqual(JSON.parse(readFileSync(join(dir, 'scenarios/test.feature/first.scenario'), 'utf-8')), {
        feature: 'test.feature'
    });
});

test('setupCucumber lists only scenarios matching tags', () => {
    setupScenarioSpecs({ isInteractive: true }, { scenarioSpecs: 'scenarios', tags: '@smoke' });
    assert.deepEqual(scenarioSpecFiles('test.feature'), ['first.scenario']);
    assert.deepEqual(scenarioSpecFiles('outline.feature'), []);
});

test('setupCucumber ignores scenarioSpecs in run mode', () => {
    const config = setupScenarioSpecs({ isInteractive: false }, { scenarioSpecs: true });
    assert.equal(config.specPattern, '*.feature');
});

test('setupCucumber reads scenarioSpecs from SCENARIO_SPECS env', () => {
    let config = setupScenarioSpecs({ isInteractive: true, env: { SCENARIO_SPECS: 'scenarios' } });
    assert.deepEqual(config.specPattern, ['*.feature', 'scenarios/**/*.scenario']);
    config = setupScenarioSpecs({ isInteractive: true, env: { SCENARIO_SPECS: 'false' } });
    assert.equal(config.specPattern, '*.feature');
    process.env.SCENARIO_SPECS = 'scenarios';
    try {
        config = setupScenarioSpecs({ isInteractive: true });
        assert.deepEqual(config.specPattern, ['*.feature', 'scenarios/**/*.scenario']);
        config = setupScenarioSpecs({ isInteractive: true }, { scenarioSpecs: false });
        assert.equal(config.specPattern, '*.feature');
    } finally {
        delete process.env.SCENARIO_SPECS;
    }
});

test('preprocessor runs single scenario of scenario spec', async () => {
    setupScenarioSpecs({ isInteractive: true }, { scenarioSpecs: 'scenarios' });
    const preprocessor = { mode: 'it', projectRoot: dir };
    assert.deepEqual(
        titles(register(await preprocess(preprocessor, 'scenarios/outline.feature/user guest.scenario'))),
        ['Scenario: user guest']
    );
    const outlineRow = register(await preprocess(preprocessor, 'scenarios/outline.feature/same_name - 2.scenario'));
    assert.deepEqual(titles(outlineRow), ['Scenario: same/name']);
    await assert.rejects(
        preprocess(preprocessor, 'scenarios/broken.feature/(parse error).scenario'),
        /Failed to parse broken\.feature/
    );
});

test('writeScenarioSpecs syncs specs with feature', async () => {
    setupScenarioSpecs({ isInteractive: true }, { scenarioSpecs: 'scenarios' });
    const featurePath = join(dir, 'sync.feature');
    const options = { outDir: join(dir, 'scenarios'), tags: '', projectRoot: dir };
    writeFileSync(featurePath, 'Feature: sync\n  Scenario: a\n    Given step\n  Scenario: b\n    Given step\n');
    writeScenarioSpecs(featurePath, options);
    assert.deepEqual(scenarioSpecFiles('sync.feature'), ['a.scenario', 'b.scenario']);
    writeFileSync(featurePath, 'Feature: sync\n  Scenario: a\n    Given step\n  Scenario: c\n    Given step\n');
    writeScenarioSpecs(featurePath, options);
    assert.deepEqual(scenarioSpecFiles('sync.feature'), ['a.scenario', 'c.scenario']);
    writeFileSync(join(dir, 'scenarios/sync.feature/b.scenario'), JSON.stringify({ feature: 'sync.feature' }));
    await assert.rejects(
        preprocess({ projectRoot: dir }, 'scenarios/sync.feature/b.scenario'),
        /Scenario 'b' is not found in sync\.feature/
    );
    rmSync(featurePath);
    writeScenarioSpecs(featurePath, options);
    assert.deepEqual(scenarioSpecFiles('sync.feature'), []);
});

test('filters scenarios by name', async () => {
    assert.deepEqual(titles(register(await preprocess({ mode: 'it', name: '^sec' }))), ['Scenario: second']);
    assert.deepEqual(titles(register(await preprocess({ mode: 'it', name: /guest/ }, 'outline.feature'))), [
        'Scenario: user guest'
    ]);
});

test('filters scenarios by lines', async () => {
    const lines = async (value, name = 'test.feature') =>
        titles(register(await preprocess({ mode: 'it', projectRoot: dir, lines: value }, name)));
    assert.deepEqual(await lines('test.feature:7'), ['Scenario: second']);
    assert.deepEqual(await lines(['test.feature:3:7']), ['Scenario: first', 'Scenario: second']);
    assert.deepEqual(await lines('test.feature'), ['Scenario: first', 'Scenario: second']);
    assert.deepEqual(await lines('test.feature:4'), []);
    assert.deepEqual(await lines('outline.feature:7'), []);
    // scenario line selects all example rows, row line selects single row
    assert.deepEqual(await lines('outline.feature:2, outline.feature:15', 'outline.feature'), [
        'Scenario: user admin',
        'Scenario: user guest',
        'Scenario: same/name'
    ]);
    assert.deepEqual(await lines(`${join(dir, 'outline.feature')}:8`, 'outline.feature'), ['Scenario: user guest']);
});

test('reads name and lines filters from env variables', async () => {
    process.env.SCENARIO_NAME = 'first';
    process.env.SCENARIO_LINES = 'test.feature:3:7';
    try {
        assert.deepEqual(titles(register(await preprocess({ mode: 'it', projectRoot: dir }))), ['Scenario: first']);
    } finally {
        delete process.env.SCENARIO_NAME;
        delete process.env.SCENARIO_LINES;
    }
});

test('setupCucumber excludes features not selected by lines or name', () => {
    const exclude = options =>
        setupCucumber(
            () => {},
            { projectRoot: dir, specPattern: '*.feature', env: {} },
            options
        ).excludeSpecPattern.sort();
    assert.deepEqual(exclude({ lines: 'test.feature:7' }), ['broken.feature', 'focus.feature', 'outline.feature']);
    assert.deepEqual(exclude({ name: 'user' }), ['focus.feature', 'test.feature']);
    const config = setupCucumber(
        () => {},
        { projectRoot: dir, specPattern: '*.feature', env: { SCENARIO_LINES: 'focus.feature' } },
        {}
    );
    assert.deepEqual(config.excludeSpecPattern.sort(), ['broken.feature', 'outline.feature', 'test.feature']);
});

test('setupCucumber lists only scenarios selected by lines', () => {
    setupScenarioSpecs({ isInteractive: true }, { scenarioSpecs: 'scenarios', lines: 'outline.feature:8' });
    assert.deepEqual(scenarioSpecFiles('outline.feature'), ['user guest.scenario']);
    assert.deepEqual(scenarioSpecFiles('test.feature'), []);
});

test('@skip(reason) skips scenario and shows reason in title', async () => {
    mkdirSync(join(dir, 'skip'), { recursive: true });
    writeFileSync(
        join(dir, 'skip/skip.feature'),
        `Feature: skip
  @skip(JIRA-123)
  Scenario: with reason
    Given step

  @skip
  Scenario: without reason
    Given step

  @skip(ignored) @only
  Scenario: focused
    Given step
`
    );
    for (const [mode, type] of [
        ['it', 'it'],
        ['describe', 'describe']
    ]) {
        const scenarios = register(await preprocess({ mode }, 'skip/skip.feature')).filter(
            item => item.type === type && item.title.startsWith('Scenario')
        );
        assert.deepEqual(
            scenarios.map(({ title, focus }) => [title, focus]),
            [
                ['Scenario: with reason (skipped: JIRA-123)', 'skip'],
                ['Scenario: without reason', 'skip'],
                ['Scenario: focused', 'only']
            ]
        );
    }
});
