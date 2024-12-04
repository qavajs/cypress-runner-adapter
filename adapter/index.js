const {
    ensureFileSync,
    writeFileSync,
    readFileSync,
} = require('fs-extra');
const { randomUUID } = require('node:crypto');
const { AstBuilder, compile, GherkinClassicTokenMatcher, Parser } = require('@cucumber/gherkin');
const webpackPreprocessor = require('@cypress/webpack-preprocessor')();

const uuidFn = () => randomUUID();
const builder = new AstBuilder(uuidFn)
const matcher = new GherkinClassicTokenMatcher();
const parser = new Parser(builder, matcher)

function adapter(testCases) {
    return `
        const tests = ${JSON.stringify(testCases)};

        function keyword(step) {
            switch (step.type) {
                case 'Context': return 'Given';
                case 'Action': return 'When';
                case 'Outcome': return 'Then';
                default: return 'Step';
            }
        }
        
        function executeStepByText(text, argument) {
            const steps = supportCodeLibrary.stepDefinitions
                .filter(stepDefinition => stepDefinition.matchesStepName(text));
            if (steps.length === 0) throw new Error(\`Step '\${text}' is not defined\`);
            if (steps.length > 1) throw new Error(\`Step '\${text}' matches multiple step definitions\`);
            const [step] = steps;
            const { parameters } = step.getInvocationParameters({
                step: { text, argument },
                world: this
            }); 
            step.code.apply(this, parameters);
        }
        
        function executeStep(pickle, world) {
            if (pickle.argument && pickle.argument.dataTable) {
                Cypress.log({ displayName: 'DataTable', message: pickle.argument.dataTable })
            }
            if (pickle.argument && pickle.argument.docString) {
                Cypress.log({ displayName: 'Multiline', message: pickle.argument.docString.content })
            }
            executeStepByText.call(world, pickle.text, pickle.argument);
        }
        
        if (supportCodeLibrary.beforeTestRunHookDefinitions.length > 0) {
            describe('Before All', function () {
                for (const beforeRun of supportCodeLibrary.beforeTestRunHookDefinitions) {
                    it('Before All', function () {
                        beforeRun.code.apply();
                    });
                }  
            })
        }
        for (const test of tests) {
            describe('Scenario: ' + test.name, { testIsolation: false }, function () {
                const world = new supportCodeLibrary.World();
                world.executeStep = executeStepByText;
                let skip = false;
                let result = 'passed';
                afterEach(function() {
                    if (this.step) {
                        for (const afterStep of supportCodeLibrary.afterTestStepHookDefinitions) {
                            if (afterStep.appliesToTestCase(this.step)) {
                                afterStep.code.apply(world, [{
                                    pickle: test, 
                                    pickleStep: this.step,
                                    gherkinDocument: tests,
                                    result: this.currentTest.state
                                }]);
                            }
                        }  
                    }
                    if (this.currentTest.state !== 'passed') {
                        skip = true;
                    }
                    result = this.currentTest.state;
                });
                for (const beforeTest of supportCodeLibrary.beforeTestCaseHookDefinitions) {
                    if (beforeTest.appliesToTestCase(test)) {
                        it(beforeTest.name, function () {
                            if (skip) return this.skip(); 
                            beforeTest.code.apply(world, [{
                                pickle: test,
                                gherkinDocument: tests,
                                willBeRetried: false
                            }]); 
                        });
                    }
                }
                for (const step of test.steps) {
                    it(keyword(step) + ': ' + step.text, function () {
                        this.step = step;
                        if (skip) return this.skip();
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
                    })
                }
                for (const afterTest of supportCodeLibrary.afterTestCaseHookDefinitions) {
                    if (afterTest.appliesToTestCase(test)) {
                        it(afterTest.name, function () {
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
        }
        if (supportCodeLibrary.afterTestRunHookDefinitions.length > 0) {
            describe('After All', function () {
                for (const afterRun of supportCodeLibrary.afterTestRunHookDefinitions) {
                    it('After All', function () {
                        afterRun.code.apply();
                    });
                }  
            })
        }      
    `;
}

module.exports = async function cucumber(file) {
    const { filePath, outputPath, shouldWatch } = file;
    if (!filePath.endsWith('.feature')) {
        return webpackPreprocessor(file)
    }
    const gherkinDocument = parser.parse(readFileSync(filePath, 'utf-8'));
    const testCases = compile(gherkinDocument, filePath, uuidFn);
    ensureFileSync(outputPath);
    writeFileSync(outputPath, adapter(testCases), 'utf-8');

    return outputPath
}
