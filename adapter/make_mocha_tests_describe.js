module.exports = function makeMochaTest(tests) {
    function log(data) {
        cy.log(data);
    }

    function attach(data, options) {
        const type = typeof options === 'string' ? options : options?.mediaType ? options.mediaType : 'text/plain';
        const name = options?.name ?? 'attachment';
        const src = typeof data === 'string' && data.startsWith('data:')
            ? data
            : `data:${type};base64,${btoa(unescape(encodeURIComponent(String(data))))}`;
        cy.then(() => {
            Cypress.log({
                displayName: name,
                message: type,
                consoleProps: () => ({ name, src })
            });
        });
    }

    function keyword(step) {
        switch (step.type) {
            case 'Context': return 'Given';
            case 'Action': return 'When';
            case 'Outcome': return 'Then';
            default: return 'Step';
        }
    }

    function stepName(pickleStep) {
        let step = pickleStep.text;
        if (pickleStep.argument) {
            step += pickleStep.argument.docString ? ' [MultiLine]' : ' [DataTable]';
        }
        return step;
    }

    function findStepDefinition(text) {
        const steps = supportCodeLibrary.stepDefinitions
            .filter(stepDefinition => stepDefinition.matchesStepName(text));
        if (steps.length === 0) throw new Error(`Step '${text}' is not defined`);
        if (steps.length > 1) throw new Error(`Step '${text}' matches multiple step definitions`);
        const [step] = steps;
        return step;
    }

    function executeStepByText(text, argument) {
        const step = findStepDefinition(text);
        const { parameters } = step.getInvocationParameters({
            step: { text, argument },
            world: this
        });
        step.code.apply(this, parameters);
    }

    function executeStep(pickle, world) {
        if (pickle.argument && pickle.argument.dataTable) {
            Cypress.log({ displayName: 'DataTable', message: pickle.argument.dataTable });
        }
        if (pickle.argument && pickle.argument.docString) {
            Cypress.log({ displayName: 'Multiline', message: pickle.argument.docString.content });
        }
        executeStepByText.call(world, pickle.text, pickle.argument);
    }

    if (supportCodeLibrary.beforeTestRunHookDefinitions.length > 0) {
        describe('Before All', function () {
            for (const beforeRun of supportCodeLibrary.beforeTestRunHookDefinitions) {
                it('Before All', function () {
                    this.test.body = beforeRun.code.toString();
                    beforeRun.code.apply();
                });
            }
        })
    }

    for (const test of tests) {
        describe('Scenario: ' + test.name, { testIsolation: false }, function () {
            const world = new supportCodeLibrary.World({
                log,
                attach,
                link: log
            });
            world.executeStep = executeStepByText;
            let skip = false;
            let status = 'passed';
            let duration = 0;
            let exception;
            let message;
            let willBeRetried = false;
            afterEach(function () {
                if (this.currentTest.state !== 'passed') {
                    skip = true;
                }
                duration += this.currentTest.duration;
                if (this.currentTest.state === 'failed') {
                    willBeRetried = this.currentTest.currentRetry() < this.currentTest._retries;
                    status = this.currentTest.state;
                    exception = this.currentTest.err;
                    message = this.currentTest.err?.message;
                }
                if (this.step) {
                    for (const afterStep of supportCodeLibrary.afterTestStepHookDefinitions) {
                        if (afterStep.appliesToTestCase(this.step)) {
                            afterStep.code.apply(world, [{
                                pickle: test,
                                pickleStep: this.step,
                                gherkinDocument: tests,
                                result: {
                                    duration,
                                    status,
                                    exception,
                                    message
                                },
                                testCaseStartedId: test.id,
                                testStepId: this.step.id,
                            }]);
                        }
                    }
                }
            });
            for (const beforeTest of supportCodeLibrary.beforeTestCaseHookDefinitions) {
                if (beforeTest.appliesToTestCase(test)) {
                    it(beforeTest.name, function () {
                        this.test.body = beforeTest.code.toString();
                        world.test = this;
                        if (skip) return this.skip();
                        beforeTest.code.apply(world, [{
                            pickle: test,
                            gherkinDocument: tests,
                            willBeRetried: false,
                            testCaseStartedId: test.id
                        }]);
                    });
                }
            }
            for (const step of test.steps) {
                it(`${keyword(step)} ${stepName(step)}`, function () {
                    this.test.body = findStepDefinition(step.text).code.toString();
                    this.step = step;
                    if (skip) return this.skip();
                    for (const beforeStep of supportCodeLibrary.beforeTestStepHookDefinitions) {
                        if (beforeStep.appliesToTestCase(step)) {
                            beforeStep.code.apply(world, [{
                                pickle: test,
                                pickleStep: step,
                                gherkinDocument: tests,
                                testCaseStartedId: test.id,
                                testStepId: this.step.id,
                            }]);
                        }
                    }
                    executeStep(step, world);
                });
            }
            for (const afterTest of supportCodeLibrary.afterTestCaseHookDefinitions) {
                if (afterTest.appliesToTestCase(test)) {
                    it(afterTest.name, function () {
                        this.test.body = afterTest.code.toString();
                        this.step = null;
                        afterTest.code.apply(world, [{
                            pickle: test,
                            result: {
                                duration,
                                status,
                                exception,
                                message
                            },
                            gherkinDocument: tests,
                            willBeRetried,
                            testCaseStartedId: test.id,
                        }]);
                    });
                }
            }
        });
    }
    if (supportCodeLibrary.afterTestRunHookDefinitions.length > 0) {
        describe('After All', function () {
            for (const afterRun of supportCodeLibrary.afterTestRunHookDefinitions) {
                it('After All', function () {
                    this.test.body = afterRun.code.toString();
                    afterRun.code.apply();
                });
            }
        });
    }
}