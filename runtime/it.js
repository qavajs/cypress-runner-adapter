import {
    library,
    keyword,
    stepName,
    createWorld,
    logStepArgument,
    executePickleStep,
    stepHookParams,
    runStepHooks,
    restoreCommandTimeout,
    testStatus,
    willRetry
} from './common.js';
import { recorder } from './messages.js';
import { createLocator, withLocation } from './location.js';
import { scenarioTitle, tagConfig, withFocus } from './tags.js';

function getResult(currentTest, stepStatus) {
    return {
        duration: currentTest.duration,
        message: currentTest.err?.message,
        status: testStatus(currentTest, stepStatus),
        exception: currentTest.err
    };
}

/**
 * Render hook or step as command log group and record its result
 * @param scenario - state of running scenario
 * @param key - hook definition or pickle step id
 */
function runStep(scenario, { keyword, name, key }, callback) {
    const displayName = keyword ? keyword : name;
    const message = keyword && name ? name : '';
    let group;
    let start;
    cy.then(() => {
        group = Cypress.log({
            name,
            displayName,
            message,
            groupStart: true
        });
        start = Date.now();
        scenario.key = key;
        recorder.startStep(scenario.run, key);
    });
    callback();
    cy.then(() => {
        recorder.finishStep(scenario.run, key, 'passed', Date.now() - start);
        scenario.key = null;
        group.endGroup();
    });
}

function renderGherkinTest(steps) {
    return steps.map(step => `${keyword(step)} ${step.text}`).join('\n');
}

/**
 * Translate each scenario to mocha `it`; steps and hooks are rendered as command log groups
 */
export function runIt(gherkinDocument, pickles) {
    const supportCodeLibrary = library();
    const locate = createLocator(gherkinDocument);
    // state of the scenario that is currently running
    let current = null;

    if (supportCodeLibrary.beforeTestRunHookDefinitions.length > 0) {
        before(function () {
            for (const beforeRun of supportCodeLibrary.beforeTestRunHookDefinitions) {
                beforeRun.code.apply();
            }
        });
    }

    afterEach(function () {
        restoreCommandTimeout();
        if (!current) return;
        const scenario = current;
        const { pickle, world, step, stepStart, run } = scenario;
        current = null;
        const result = getResult(this.currentTest, scenario.skipped?.status);
        const willBeRetried = willRetry(this.currentTest);
        // corner case to complete AfterStep if test is failed
        if (result.status === 'failed' && step) {
            runStepHooks(supportCodeLibrary.afterTestStepHookDefinitions, pickle, world, {
                ...stepHookParams(gherkinDocument, pickle, step),
                result: { ...result, duration: Date.now() - stepStart },
                error: result.exception,
                willBeRetried: false
            });
        }
        if (run) {
            const failedKey = scenario.key ?? scenario.failedKey;
            if (result.status === 'failed' && failedKey) {
                recorder.finishStep(run, failedKey, 'failed', Date.now() - stepStart, result.exception);
            }
            if (scenario.skipped) {
                recorder.finishStep(run, scenario.skipped.key, scenario.skipped.status, 0);
            }
            recorder.finishRemainingSteps(run, 'skipped');
        }
        for (const afterTest of supportCodeLibrary.afterTestCaseHookDefinitions) {
            if (afterTest.appliesToTestCase(pickle)) {
                runStep(scenario, { name: afterTest.name, key: afterTest }, function () {
                    afterTest.code.apply(world, [
                        {
                            pickle,
                            result,
                            error: result.exception,
                            gherkinDocument,
                            testCaseStartedId: pickle.id,
                            willBeRetried
                        }
                    ]);
                });
            }
        }
        if (run) {
            cy.then(() => recorder.finishTestCase(run, willBeRetried));
        }
    });

    for (const pickle of pickles) {
        withFocus(it, pickle)(scenarioTitle(pickle), tagConfig(pickle), function () {
            this.test.body = renderGherkinTest(pickle.steps);
            const world = createWorld();
            const scenario = (current = {
                pickle,
                world,
                run: recorder.startTestCase(pickle, this.test.currentRetry()),
                step: null,
                stepStart: 0,
                key: null
            });
            cy.on('fail', error => {
                throw withLocation(error, scenario.step ? locate(scenario.step) : locate(pickle));
            });
            for (const beforeTest of supportCodeLibrary.beforeTestCaseHookDefinitions) {
                if (beforeTest.appliesToTestCase(pickle)) {
                    runStep(scenario, { name: beforeTest.name, key: beforeTest }, function () {
                        beforeTest.code.apply(world, [
                            {
                                pickle,
                                gherkinDocument,
                                willBeRetried: false,
                                testCaseStartedId: pickle.id
                            }
                        ]);
                    });
                }
            }
            for (const step of pickle.steps) {
                runStep(scenario, { keyword: keyword(step), name: stepName(step), key: step.id }, () => {
                    const params = stepHookParams(gherkinDocument, pickle, step);
                    // step body only enqueues commands, so track the active step at execution time
                    cy.then(() => {
                        scenario.step = step;
                        scenario.stepStart = Date.now();
                    });
                    runStepHooks(supportCodeLibrary.beforeTestStepHookDefinitions, pickle, world, {
                        ...params,
                        willBeRetried: false
                    });
                    cy.then(() => logStepArgument(step));
                    let stepResult;
                    try {
                        stepResult = executePickleStep(step, world);
                    } catch (error) {
                        scenario.failedKey = step.id;
                        throw withLocation(error, locate(step));
                    }
                    if (stepResult === 'pending' || stepResult === 'skipped') {
                        scenario.skipped = { key: step.id, status: stepResult };
                        return this.skip();
                    }
                    cy.then(() => {
                        const result = { status: 'passed', duration: Date.now() - scenario.stepStart };
                        scenario.step = null;
                        runStepHooks(supportCodeLibrary.afterTestStepHookDefinitions, pickle, world, {
                            ...params,
                            result,
                            willBeRetried: false
                        });
                    });
                });
            }
        });
    }

    if (supportCodeLibrary.afterTestRunHookDefinitions.length > 0) {
        after(function () {
            for (const afterRun of supportCodeLibrary.afterTestRunHookDefinitions) {
                afterRun.code.apply();
            }
        });
    }
}
