import { CucumberExpression, ParameterTypeRegistry, RegularExpression } from '@cucumber/cucumber-expressions';
import StepDefinition from './step_definition.js';
import TestCaseHookDefinition from './test_case_hook_definition.js';
import TestStepHookDefinition from './test_step_hook_definition.js';
import { buildParameterType } from './build_parameter_type.js';
import TestRunHookDefinition from './test_run_hook_definition.js';

export class World {
    constructor(options) {
        this.log = options.log;
        this.attach = options.attach;
        this.link = options.link;
    }
}

const supportCodeLibrary = {
    stepDefinitions: [],
    afterTestCaseHookDefinitions: [],
    afterTestRunHookDefinitions: [],
    afterTestStepHookDefinitions: [],
    beforeTestCaseHookDefinitions: [],
    beforeTestRunHookDefinitions: [],
    beforeTestStepHookDefinitions: [],
    World,
    parameterTypeRegistry: new ParameterTypeRegistry()
};

window.supportCodeLibrary = supportCodeLibrary;

/**
 * Define step
 * @param {string} keyword - Given | When | Then
 * @param {string | RegExp} pattern - cucumber expression or regular expression
 * @param {{ timeout?: number } | Function} optionsOrCode - step options or step implementation
 * @param {Function} [code] - step implementation
 */
export function defineStep(keyword, pattern, optionsOrCode, code) {
    const options = code ? optionsOrCode : {};
    const handler = code ?? optionsOrCode;
    const expression =
        typeof pattern === 'string'
            ? new CucumberExpression(pattern, supportCodeLibrary.parameterTypeRegistry)
            : new RegularExpression(pattern, supportCodeLibrary.parameterTypeRegistry);
    supportCodeLibrary.stepDefinitions.push(
        new StepDefinition({
            keyword,
            expression,
            pattern,
            options,
            code: handler
        })
    );
}

export function When(pattern, optionsOrCode, code) {
    defineStep('When', pattern, optionsOrCode, code);
}

export function Then(pattern, optionsOrCode, code) {
    defineStep('Then', pattern, optionsOrCode, code);
}

export function Given(pattern, optionsOrCode, code) {
    defineStep('Given', pattern, optionsOrCode, code);
}

function defineHook(definitions, HookDefinition, name, optionsOrCode, code) {
    const options = { name, ...(code ? optionsOrCode : {}) };
    definitions.push(
        new HookDefinition({
            code: code ?? optionsOrCode,
            options
        })
    );
}

export function Before(optionsOrCode, code) {
    defineHook(supportCodeLibrary.beforeTestCaseHookDefinitions, TestCaseHookDefinition, 'Before', optionsOrCode, code);
}

export function After(optionsOrCode, code) {
    defineHook(supportCodeLibrary.afterTestCaseHookDefinitions, TestCaseHookDefinition, 'After', optionsOrCode, code);
}

export function BeforeStep(optionsOrCode, code) {
    defineHook(
        supportCodeLibrary.beforeTestStepHookDefinitions,
        TestStepHookDefinition,
        'BeforeStep',
        optionsOrCode,
        code
    );
}

export function AfterStep(optionsOrCode, code) {
    defineHook(
        supportCodeLibrary.afterTestStepHookDefinitions,
        TestStepHookDefinition,
        'AfterStep',
        optionsOrCode,
        code
    );
}

export function BeforeAll(handler) {
    supportCodeLibrary.beforeTestRunHookDefinitions.push(
        new TestRunHookDefinition({
            code: handler
        })
    );
}

export function AfterAll(handler) {
    supportCodeLibrary.afterTestRunHookDefinitions.push(
        new TestRunHookDefinition({
            code: handler
        })
    );
}

export function setWorldConstructor(world) {
    supportCodeLibrary.World = world;
}

export function defineParameterType(options) {
    const parameterType = buildParameterType(options);
    supportCodeLibrary.parameterTypeRegistry.defineParameterType(parameterType);
}

export function setDefaultTimeout(milliseconds) {
    Cypress.config('defaultCommandTimeout', milliseconds);
}

/**
 * Define template step
 * @param {() => string} scenario - multiline string with steps
 * @example
 * When('I click {string} and verify {string}', Template((locator, expected) => `
 *     I click '${locator}'
 *     I expect '${locator} > Value' to equal '${expected}'
 * `));
 */
export function Template(scenario) {
    return new Proxy(scenario, {
        apply: function (template, world, args) {
            const scenario = template(...args);
            const steps = scenario
                .split('\n')
                .map(step => step.trim())
                .filter(Boolean);
            for (const step of steps) {
                world.executeStep(step);
            }
        }
    });
}
