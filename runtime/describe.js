import {
    library,
    keyword,
    stepName,
    stepBody,
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
import { hasTag, scenarioTitle, tagConfig, withFocus } from './tags.js';

/**
 * Translate each scenario to mocha `describe` and each step/hook to `it`
 */
export function runDescribe(gherkinDocument, pickles) {
    const supportCodeLibrary = library();
    const locate = createLocator(gherkinDocument);
    // run hooks have to be focused too, otherwise they are excluded by @only scenarios
    const runHookSuite = pickles.some(pickle => hasTag(pickle, '@only')) ? describe.only : describe;

    if (supportCodeLibrary.beforeTestRunHookDefinitions.length > 0) {
        runHookSuite('Before All', function () {
            for (const beforeRun of supportCodeLibrary.beforeTestRunHookDefinitions) {
                it('Before All', function () {
                    this.test.body = beforeRun.code.toString();
                    beforeRun.code.apply();
                });
            }
        });
    }

    for (const pickle of pickles) {
        const suiteConfig = { testIsolation: false, ...tagConfig(pickle) };
        withFocus(describe, pickle)(scenarioTitle(pickle), suiteConfig, function () {
            const world = createWorld();
            const scenarioLocation = locate(pickle);
            let skip = false;
            let status = 'passed';
            let duration = 0;
            let exception;
            let currentStep = null;
            let currentStepStatus;
            // recorder state: test case run, key of running hook/step and number of tests left in scenario
            let run = null;
            let currentKey = null;
            let remaining = 0;

            function track(key, location) {
                run ??= recorder.startTestCase(pickle);
                currentKey = key;
                recorder.startStep(run, key);
                cy.on('fail', error => {
                    throw withLocation(error, location);
                });
            }

            afterEach(function () {
                const currentTest = this.currentTest;
                restoreCommandTimeout();
                const retrying = willRetry(currentTest);
                const testResult = testStatus(currentTest, currentStepStatus);
                duration += currentTest.duration ?? 0;
                if (!retrying) {
                    if (testResult !== 'passed') {
                        skip = true;
                    }
                    if (testResult === 'failed') {
                        status = testResult;
                        exception = currentTest.err;
                    }
                }
                if (currentStep) {
                    runStepHooks(supportCodeLibrary.afterTestStepHookDefinitions, pickle, world, {
                        ...stepHookParams(gherkinDocument, pickle, currentStep),
                        result: {
                            duration: currentTest.duration ?? 0,
                            status: testResult,
                            exception: currentTest.err,
                            message: currentTest.err?.message
                        },
                        error: currentTest.err,
                        willBeRetried: retrying
                    });
                }
                if (!retrying && currentKey) {
                    recorder.finishStep(run, currentKey, testResult, currentTest.duration, currentTest.err);
                    remaining--;
                    if (remaining === 0) recorder.finishTestCase(run);
                }
                currentStep = null;
                currentStepStatus = undefined;
                currentKey = null;
            });

            for (const beforeTest of supportCodeLibrary.beforeTestCaseHookDefinitions) {
                if (beforeTest.appliesToTestCase(pickle)) {
                    remaining++;
                    it(beforeTest.name, function () {
                        this.test.body = beforeTest.code.toString();
                        track(beforeTest, scenarioLocation);
                        world.test = this;
                        if (skip) return this.skip();
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
                remaining++;
                it(`${keyword(step)} ${stepName(step)}`, function () {
                    const location = locate(step);
                    this.test.body = stepBody(step.text);
                    track(step.id, location);
                    if (skip) return this.skip();
                    currentStep = step;
                    runStepHooks(
                        supportCodeLibrary.beforeTestStepHookDefinitions,
                        pickle,
                        world,
                        stepHookParams(gherkinDocument, pickle, step)
                    );
                    logStepArgument(step);
                    let stepResult;
                    try {
                        stepResult = executePickleStep(step, world);
                    } catch (error) {
                        throw withLocation(error, location);
                    }
                    if (stepResult === 'pending' || stepResult === 'skipped') {
                        skip = true;
                        status = stepResult;
                        currentStepStatus = stepResult;
                        return this.skip();
                    }
                });
            }

            for (const afterTest of supportCodeLibrary.afterTestCaseHookDefinitions) {
                if (afterTest.appliesToTestCase(pickle)) {
                    remaining++;
                    it(afterTest.name, function () {
                        this.test.body = afterTest.code.toString();
                        track(afterTest, scenarioLocation);
                        afterTest.code.apply(world, [
                            {
                                pickle,
                                result: {
                                    duration,
                                    status,
                                    exception,
                                    message: exception?.message
                                },
                                error: exception,
                                gherkinDocument,
                                willBeRetried: false,
                                testCaseStartedId: pickle.id
                            }
                        ]);
                    });
                }
            }
        });
    }

    if (supportCodeLibrary.afterTestRunHookDefinitions.length > 0) {
        runHookSuite('After All', function () {
            for (const afterRun of supportCodeLibrary.afterTestRunHookDefinitions) {
                it('After All', function () {
                    this.test.body = afterRun.code.toString();
                    afterRun.code.apply();
                });
            }
        });
    }
}
