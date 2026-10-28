const STATUS = {
    passed: 'PASSED',
    failed: 'FAILED',
    pending: 'PENDING',
    skipped: 'SKIPPED',
    undefined: 'UNDEFINED',
    ambiguous: 'AMBIGUOUS'
};

const FAILED_STATUSES = ['FAILED', 'UNDEFINED', 'AMBIGUOUS', 'PENDING'];

let idCounter = 0;

function newId() {
    return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${idCounter++}`;
}

export function timestamp(ms = Date.now()) {
    return { seconds: Math.floor(ms / 1000), nanos: (ms % 1000) * 1e6 };
}

export function duration(ms = 0) {
    const value = Math.max(0, ms);
    return { seconds: Math.floor(value / 1000), nanos: Math.round((value % 1000) * 1e6) };
}

function toGroup(group) {
    return {
        start: group.start,
        value: group.value,
        children: (group.children ?? []).map(toGroup)
    };
}

function stepMatchArguments(definition, text) {
    const args = definition.expression.match(text) ?? [];
    return {
        stepMatchArguments: args.map(arg => ({
            group: toGroup(arg.group),
            parameterTypeName: arg.parameterType.name
        }))
    };
}

function errorStatus(error) {
    if (error?.name === 'UndefinedStepError') return STATUS.undefined;
    if (error?.name === 'AmbiguousStepError') return STATUS.ambiguous;
    return STATUS.failed;
}

/**
 * Records cucumber messages (https://github.com/cucumber/messages) in browser
 * and sends them to node process at the end of spec
 */
class MessageRecorder {
    enabled = false;
    envelopes = [];
    success = true;
    current = null;
    runs = new Set();
    testCases = new Map();
    definitionIds = new Map();

    init({ enabled, source, gherkinDocument, pickles, library }) {
        this.enabled = enabled;
        if (!enabled) return;
        this.library = library;
        this.pickles = pickles;
        this.emit({ source: { uri: gherkinDocument.uri, data: source, mediaType: 'text/x.cucumber.gherkin+plain' } });
        this.emit({ gherkinDocument });
        for (const pickle of pickles) {
            this.emit({ pickle });
        }
        for (const definition of library.stepDefinitions) {
            const id = this.definitionId(definition);
            const isString = typeof definition.pattern === 'string';
            this.emit({
                stepDefinition: {
                    id,
                    pattern: {
                        source: isString ? definition.pattern : definition.pattern.source,
                        type: isString ? 'CUCUMBER_EXPRESSION' : 'REGULAR_EXPRESSION'
                    },
                    sourceReference: {}
                }
            });
        }
        const hooks = [
            ['BEFORE_TEST_RUN', library.beforeTestRunHookDefinitions],
            ['AFTER_TEST_RUN', library.afterTestRunHookDefinitions],
            ['BEFORE_TEST_CASE', library.beforeTestCaseHookDefinitions],
            ['AFTER_TEST_CASE', library.afterTestCaseHookDefinitions],
            ['BEFORE_TEST_STEP', library.beforeTestStepHookDefinitions],
            ['AFTER_TEST_STEP', library.afterTestStepHookDefinitions]
        ];
        for (const [type, definitions] of hooks) {
            for (const definition of definitions) {
                const hook = { id: this.definitionId(definition), type, sourceReference: {} };
                if (definition.name) hook.name = definition.name;
                if (definition.tagExpression) hook.tagExpression = definition.tagExpression;
                this.emit({ hook });
            }
        }
    }

    emit(envelope) {
        if (this.enabled) this.envelopes.push(envelope);
    }

    definitionId(definition) {
        if (!this.definitionIds.has(definition)) {
            this.definitionIds.set(definition, newId());
        }
        return this.definitionIds.get(definition);
    }

    testCase(pickle) {
        if (this.testCases.has(pickle.id)) return this.testCases.get(pickle.id);
        const library = this.library;
        const stepIds = new Map();
        const testSteps = [];
        const afterHookStepIds = new Set();
        for (const hook of library.beforeTestCaseHookDefinitions.filter(hook => hook.appliesToTestCase(pickle))) {
            const id = newId();
            stepIds.set(hook, id);
            testSteps.push({ id, hookId: this.definitionId(hook) });
        }
        for (const pickleStep of pickle.steps) {
            const id = newId();
            const definitions = library.stepDefinitions.filter(definition =>
                definition.matchesStepName(pickleStep.text)
            );
            stepIds.set(pickleStep.id, id);
            testSteps.push({
                id,
                pickleStepId: pickleStep.id,
                stepDefinitionIds: definitions.map(definition => this.definitionId(definition)),
                stepMatchArgumentsLists: definitions.map(definition => stepMatchArguments(definition, pickleStep.text))
            });
        }
        for (const hook of library.afterTestCaseHookDefinitions.filter(hook => hook.appliesToTestCase(pickle))) {
            const id = newId();
            stepIds.set(hook, id);
            afterHookStepIds.add(id);
            testSteps.push({ id, hookId: this.definitionId(hook) });
        }
        const testCase = { id: newId(), pickleId: pickle.id, testSteps };
        this.emit({ testCase });
        const entry = { testCase, stepIds, afterHookStepIds };
        this.testCases.set(pickle.id, entry);
        return entry;
    }

    /**
     * Start test case attempt
     * @returns run handle or null if recording is disabled
     */
    startTestCase(pickle, attempt = 0) {
        if (!this.enabled) return null;
        const { testCase, stepIds, afterHookStepIds } = this.testCase(pickle);
        const run = {
            id: newId(),
            testCase,
            stepIds,
            afterHookStepIds,
            started: new Set(),
            finished: new Set(),
            failed: false,
            done: false
        };
        this.runs.add(run);
        this.emit({ testCaseStarted: { id: run.id, testCaseId: testCase.id, attempt, timestamp: timestamp() } });
        return run;
    }

    /**
     * @param run - run handle
     * @param key - hook definition or pickle step id
     */
    startStep(run, key) {
        if (!run) return;
        const testStepId = run.stepIds.get(key);
        this.current = { testCaseStartedId: run.id, testStepId };
        if (run.started.has(testStepId)) return;
        run.started.add(testStepId);
        this.emit({ testStepStarted: { testCaseStartedId: run.id, testStepId, timestamp: timestamp() } });
    }

    finishStep(run, key, status, durationMs, error) {
        if (!run) return;
        const testStepId = run.stepIds.get(key);
        this.finishTestStep(run, testStepId, status, durationMs, error);
    }

    finishTestStep(run, testStepId, status, durationMs, error) {
        if (run.finished.has(testStepId)) return;
        if (!run.started.has(testStepId)) {
            run.started.add(testStepId);
            this.emit({ testStepStarted: { testCaseStartedId: run.id, testStepId, timestamp: timestamp() } });
        }
        run.finished.add(testStepId);
        const testStepResult = {
            status: status === 'failed' ? errorStatus(error) : (STATUS[status] ?? STATUS.failed),
            duration: duration(durationMs)
        };
        if (error) {
            testStepResult.message = error.message;
            testStepResult.exception = { type: error.name ?? 'Error', message: error.message, stackTrace: error.stack };
        }
        if (FAILED_STATUSES.includes(testStepResult.status)) run.failed = true;
        this.emit({
            testStepFinished: { testCaseStartedId: run.id, testStepId, testStepResult, timestamp: timestamp() }
        });
        if (this.current?.testStepId === testStepId) this.current = null;
    }

    /**
     * Mark not finished steps (except after hooks) with status
     */
    finishRemainingSteps(run, status = 'skipped') {
        if (!run) return;
        for (const { id } of run.testCase.testSteps) {
            if (!run.afterHookStepIds.has(id)) {
                this.finishTestStep(run, id, status, 0);
            }
        }
    }

    finishTestCase(run, willBeRetried = false) {
        if (!run || run.done) return;
        run.done = true;
        for (const { id } of run.testCase.testSteps) {
            this.finishTestStep(run, id, 'skipped', 0);
        }
        if (run.failed && !willBeRetried) this.success = false;
        this.emit({ testCaseFinished: { testCaseStartedId: run.id, timestamp: timestamp(), willBeRetried } });
    }

    attach({ body, mediaType, contentEncoding = 'IDENTITY', fileName }) {
        if (!this.enabled || !this.current) return;
        const attachment = { ...this.current, body, mediaType, contentEncoding };
        if (fileName) attachment.fileName = fileName;
        this.emit({ attachment });
    }

    /**
     * Finish dangling test cases, report not executed (e.g. @skip) scenarios as skipped
     * and return recorded envelopes
     */
    flush() {
        for (const pickle of this.pickles ?? []) {
            if (!this.testCases.has(pickle.id)) {
                this.startTestCase(pickle);
            }
        }
        for (const run of this.runs) {
            this.finishTestCase(run);
        }
        const envelopes = this.envelopes;
        this.envelopes = [];
        this.runs.clear();
        return { envelopes, success: this.success };
    }
}

export const recorder = new MessageRecorder();
export const MESSAGES_TASK = 'qavajs:cucumber:messages';
