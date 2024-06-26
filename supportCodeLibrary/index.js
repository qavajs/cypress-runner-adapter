import { CucumberExpression, RegularExpression } from '@cucumber/cucumber-expressions'
import StepDefinition from './step_definition';
import { SourcedParameterTypeRegistry } from './sourced_parameter_type_registry';
import TestCaseHookDefinition from './test_case_hook_definition';
import TestStepHookDefinition from './test_step_hook_definition';
import { buildParameterType } from './build_parameter_type';
import TestRunHookDefinition from './test_run_hook_definition';
class World {}

const supportCodeLibrary = {
    stepDefinitions: [],
    afterTestCaseHookDefinitions: [],
    afterTestRunHookDefinitions: [],
    afterTestStepHookDefinitions: [],
    beforeTestCaseHookDefinitions: [],
    beforeTestRunHookDefinitions: [],
    beforeTestStepHookDefinitions: [],
    World,
    parameterTypeRegistry: new SourcedParameterTypeRegistry()
};

window.supportCodeLibrary = supportCodeLibrary;
export function defineStep(keyword, pattern, code) {
    const expression = typeof pattern === 'string'
        ? new CucumberExpression(pattern, supportCodeLibrary.parameterTypeRegistry)
        : new RegularExpression(pattern, supportCodeLibrary.parameterTypeRegistry);
    supportCodeLibrary.stepDefinitions.push(new StepDefinition({
        keyword,
        expression,
        pattern,
        code
    }));
}

export function When(pattern, code) {
    defineStep('When', pattern, code);
}

export function Then(pattern, code) {
    defineStep('Then', pattern, code);
}

export function Given(pattern, code) {
    defineStep('Given', pattern, code);
}

export function Before(optionsOrCode, code) {
    const defaultOptions = { name: 'Before' };
    const options = code ? Object.assign(defaultOptions, optionsOrCode) : defaultOptions;
    const handler = code ?? optionsOrCode;
    supportCodeLibrary.beforeTestCaseHookDefinitions.push(new TestCaseHookDefinition({
        code: handler,
        options
    }));
}

export function After(optionsOrCode, code) {
    const defaultOptions = { name: 'After' };
    const options = code ? Object.assign(defaultOptions, optionsOrCode) : defaultOptions;
    const handler = code ?? optionsOrCode;
    supportCodeLibrary.afterTestCaseHookDefinitions.push(new TestCaseHookDefinition({
        code: handler,
        options
    }));
}

export function BeforeStep(optionsOrCode, code) {
    const options = code ? optionsOrCode : { name: 'BeforeStep' };
    const handler = code ?? optionsOrCode;
    supportCodeLibrary.beforeTestStepHookDefinitions.push(new TestStepHookDefinition({
        code: handler,
        options
    }));
}

export function AfterStep(optionsOrCode, code) {
    const options = code ? optionsOrCode : { name: 'AfterStep' };
    const handler = code ?? optionsOrCode;
    supportCodeLibrary.afterTestStepHookDefinitions.push(new TestStepHookDefinition({
        code: handler,
        options
    }));
}

export function BeforeAll(handler) {
    supportCodeLibrary.beforeTestRunHookDefinitions.push(new TestRunHookDefinition({
        code: handler,
    }));
}

export function AfterAll(handler) {
    supportCodeLibrary.afterTestRunHookDefinitions.push(new TestRunHookDefinition({
        code: handler,
    }));
}

export function setWorldConstructor(world) {
    supportCodeLibrary.World = world;
}

export function defineParameterType(options) {
    const parameterType = buildParameterType(options)
    supportCodeLibrary.parameterTypeRegistry.defineSourcedParameterType(parameterType, {})
}


