const {
    ensureFileSync,
    writeFileSync,
    readFileSync,
} = require('fs-extra');
const chokidar = require('chokidar');
const { randomUUID } = require('node:crypto');
const { AstBuilder, compile, GherkinClassicTokenMatcher, Parser } = require('@cucumber/gherkin');
const cyBrowserify = require('@cypress/browserify-preprocessor')()

const uuidFn = () => randomUUID();
const builder = new AstBuilder(uuidFn)
const matcher = new GherkinClassicTokenMatcher();
const parser = new Parser(builder, matcher)

function adapter(testCases) {
    return `
        const tests = ${JSON.stringify(testCases)};
        function executeStep(pickle, world) {
            if (pickle.argument) {
                Cypress.log({ displayName: 'Argument', message: pickle.argument })
            }
            const steps = supportCodeLibrary.stepDefinitions
                .filter(stepDefinition => stepDefinition.matchesStepName(pickle.text));
            if (steps.length === 0) throw new Error(\`Step '\${pickle.text}' is not defined\`);
            if (steps.length > 1) throw new Error(\`'\${pickle.text}' matches multiple step definitions\`);
            const [step] = steps;
            const { parameters } = step.getInvocationParameters({
                step: {
                    text: pickle.text,
                    argument: pickle.argument
                },
                world
            }); 
            step.code.apply(world, parameters);
        }
        for (const test of tests) {
            describe('Scenario: ' + test.name, { testIsolation: false }, function () {
                Cypress.log({ displayName: 'Tags', message: test.tags })
                const world = new supportCodeLibrary.World();
                let skip = false;
                afterEach(function() {
                    if (this.step) {
                        for (const afterStep of supportCodeLibrary.afterTestStepHookDefinitions) {
                            if (afterStep.appliesToTestCase(this.step)) {
                                afterStep.code.apply(world) 
                            }
                        }  
                    }
                    if (this.currentTest.state !== 'passed') {
                        skip = true;
                    }
                });
                for (const beforeTest of supportCodeLibrary.beforeTestCaseHookDefinitions) {
                    if (beforeTest.appliesToTestCase(test)) {
                        it(beforeTest.name, function () {
                            if (skip) return this.skip(); 
                            beforeTest.code.apply(world) 
                        });
                    }
                }
                for (const step of test.steps) {
                    it(step.text, function () {
                        this.step = step;
                        if (skip) return this.skip();
                        for (const beforeStep of supportCodeLibrary.beforeTestStepHookDefinitions) {
                            if (beforeStep.appliesToTestCase(step)) {
                                beforeStep.code.apply(world) 
                            }
                        } 
                        executeStep(step, world);
                    })
                }
                for (const afterTest of supportCodeLibrary.afterTestCaseHookDefinitions) {
                    if (afterTest.appliesToTestCase(test)) {
                        it(afterTest.name, function () {
                            afterTest.code.apply(world)
                        });
                    }
                }
            });
        }      
    `;
}

module.exports = async function cucumber(file) {
    const { filePath, outputPath, shouldWatch } = file;
    if (!filePath.endsWith('.feature')) {
        return cyBrowserify(file)
    }
    if (shouldWatch) {
        const watcher = chokidar.watch(filePath);
        watcher.on('change', () => {
            const gherkinDocument = parser.parse(readFileSync(filePath, 'utf-8'));
            const testCases = compile(gherkinDocument, filePath, uuidFn);
            ensureFileSync(outputPath);
            writeFileSync(outputPath, adapter(testCases), 'utf8');
            file.emit('rerun');
        });

        file.on('close', () => {
            watcher.close()
        })

        return outputPath
    }
    const gherkinDocument = parser.parse(readFileSync(filePath, 'utf-8'));
    const testCases = compile(gherkinDocument, filePath, uuidFn);
    ensureFileSync(outputPath);
    writeFileSync(outputPath, adapter(testCases), 'utf8');

    return outputPath
}
