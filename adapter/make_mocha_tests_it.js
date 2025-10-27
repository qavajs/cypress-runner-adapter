module.exports = function makeMochaTest(tests) {
    function keyword(step) {
        switch (step.type) {
            case 'Context':
                return 'Given';
            case 'Action':
                return 'When';
            case 'Outcome':
                return 'Then';
            default:
                return 'Step';
        }
    }

    function getResult(currentTest) {
        return {
            duration: currentTest.duration,
            message: currentTest.err?.message,
            status: currentTest.state,
            exception: currentTest.err
        }
    }

    function executeStepByText(text, argument) {
        const steps = supportCodeLibrary.stepDefinitions
            .filter(stepDefinition => stepDefinition.matchesStepName(text));
        if (steps.length === 0) throw new Error(`Step '${text}' is not defined`);
        if (steps.length > 1) throw new Error(`Step '${text}' matches multiple step definitions`);
        const [step] = steps;
        const {parameters} = step.getInvocationParameters({
            step: {text, argument},
            world: this
        });
        step.code.apply(this, parameters);
    }

    function executeStep(pickle, world) {
        cy.then(() => {
            if (pickle.argument && pickle.argument.dataTable) {
                Cypress.log({displayName: 'DataTable', message: pickle.argument.dataTable});
            }
            if (pickle.argument && pickle.argument.docString) {
                Cypress.log({displayName: 'Multiline', message: pickle.argument.docString.content});
            }
        });
        executeStepByText.call(world, pickle.text, pickle.argument);
    }

    supportCodeLibrary.World.prototype.executeStep = executeStepByText;

    function runStep(name, callback) {
        cy.then(() => {
            Cypress.log({displayName: name, message: ''});
        })
        callback();
    }

    function findTest(tests, name) {
        const testName = name.replace(/Scenario:\s+/, '');
        return tests.find(test => test.name === testName);
    }

    if (supportCodeLibrary.beforeTestRunHookDefinitions.length > 0) {
        before(function () {
            for (const beforeRun of supportCodeLibrary.beforeTestRunHookDefinitions) {
                beforeRun.code.apply();
            }
        })
    }

    beforeEach(function () {
        const test = findTest(tests, this.currentTest.title);
        const world = this.world = new supportCodeLibrary.World();
        for (const beforeTest of supportCodeLibrary.beforeTestCaseHookDefinitions) {
            if (beforeTest.appliesToTestCase(test)) {
                runStep(beforeTest.name, function () {
                    beforeTest.code.apply(world, [{
                        pickle: test,
                        gherkinDocument: tests,
                        willBeRetried: false
                    }]);
                });
            }
        }
    });

    afterEach(function () {
        const test = findTest(tests, this.currentTest.title);
        const world = this.world;
        const result = getResult(this.currentTest);
        for (const afterTest of supportCodeLibrary.afterTestCaseHookDefinitions) {
            if (afterTest.appliesToTestCase(test)) {
                runStep(afterTest.name, function () {
                    afterTest.code.apply(world, [{
                        pickle: test,
                        result,
                        gherkinDocument: tests,
                        willBeRetried: false
                    }]);
                });
            }
        }
    });

    for (const test of tests) {
        it('Scenario: ' + test.name, function () {
            const world = this.world;
            for (const step of test.steps) {
                const stepName = keyword(step) + ': ' + step.text;
                runStep(stepName, function () {
                    this.step = step;
                    const result = { status: 'passed', duration: 0 };
                    for (const beforeStep of supportCodeLibrary.beforeTestStepHookDefinitions) {
                        if (beforeStep.appliesToTestCase(step)) {
                            beforeStep.code.apply(world, [{
                                pickle: test,
                                pickleStep: step,
                                gherkinDocument: tests
                            }]);
                        }
                    }
                    executeStep(step, world);
                    for (const afterStep of supportCodeLibrary.afterTestStepHookDefinitions) {
                        if (afterStep.appliesToTestCase(this.step)) {
                            afterStep.code.apply(world, [{
                                pickle: test,
                                pickleStep: this.step,
                                gherkinDocument: tests,
                                result
                            }]);
                        }
                    }
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
