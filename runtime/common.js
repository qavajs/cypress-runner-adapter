import { generateSnippet } from './snippet.js';
import { recorder } from './messages.js';

class UndefinedStepError extends Error {
    name = 'UndefinedStepError';
}

class AmbiguousStepError extends Error {
    name = 'AmbiguousStepError';
}

export function library() {
    return window.supportCodeLibrary;
}

function recordAttachment(attachment) {
    if (recorder.enabled) {
        cy.then(() => recorder.attach(attachment));
    }
}

export function log(data) {
    cy.log(data);
    recordAttachment({ body: String(data), mediaType: 'text/x.cucumber.log+plain' });
}

export function link(url) {
    cy.log(url);
    recordAttachment({ body: String(url), mediaType: 'text/uri-list' });
}

function toBase64(data) {
    const bytes = new TextEncoder().encode(String(data));
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary);
}

const DATA_URI = /^data:([^;,]+)?(;base64)?,(.*)$/s;

export function attach(data, options) {
    const type = typeof options === 'string' ? options : options?.mediaType ? options.mediaType : 'text/plain';
    const name = options?.name ?? 'attachment';
    const isDataUri = typeof data === 'string' && data.startsWith('data:');
    const src = isDataUri ? data : `data:${type};base64,${toBase64(data)}`;
    cy.then(() => {
        Cypress.log({
            displayName: name,
            message: type,
            consoleProps: () => ({ name, src })
        });
    });
    const dataUri = isDataUri ? data.match(DATA_URI) : null;
    recordAttachment(
        dataUri
            ? {
                  body: dataUri[3],
                  mediaType: dataUri[1] ?? type,
                  contentEncoding: dataUri[2] ? 'BASE64' : 'IDENTITY',
                  fileName: options?.name
              }
            : { body: String(data), mediaType: type, fileName: options?.name }
    );
}

export function keyword(step) {
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

export function stepName(pickleStep) {
    let step = pickleStep.text;
    if (pickleStep.argument) {
        step += pickleStep.argument.docString ? ' [MultiLine]' : ' [DataTable]';
    }
    return step;
}

export function findStepDefinition(text, argument, stepKeyword = 'When') {
    const { stepDefinitions, parameterTypeRegistry } = library();
    const steps = stepDefinitions.filter(stepDefinition => stepDefinition.matchesStepName(text));
    if (steps.length === 0) {
        const snippetKeyword = stepKeyword === 'Step' ? 'When' : stepKeyword;
        const snippet = generateSnippet(snippetKeyword, text, parameterTypeRegistry.parameterTypes, argument);
        throw new UndefinedStepError(
            `Step '${text}' is not defined. Implement it with the snippet below:\n\n${snippet}`
        );
    }
    if (steps.length > 1) {
        const patterns = steps.map(step => `  - ${step.pattern}`).join('\n');
        throw new AmbiguousStepError(`Step '${text}' matches multiple step definitions:\n${patterns}`);
    }
    const [step] = steps;
    return step;
}

/**
 * Source code of the matching step definition, or empty string if step cannot be resolved
 */
export function stepBody(text) {
    try {
        return findStepDefinition(text).code.toString();
    } catch {
        return '';
    }
}

// command timeouts overridden by steps with `timeout` option
const commandTimeouts = [];

function withCommandTimeout(timeout, fn) {
    cy.then(() => {
        commandTimeouts.push(Cypress.config('defaultCommandTimeout'));
        Cypress.config('defaultCommandTimeout', timeout);
    });
    const result = fn();
    cy.then(() => {
        Cypress.config('defaultCommandTimeout', commandTimeouts.pop());
    });
    return result;
}

/**
 * Restore command timeout if step failed before its timeout was reset
 */
export function restoreCommandTimeout() {
    if (commandTimeouts.length > 0) {
        Cypress.config('defaultCommandTimeout', commandTimeouts[0]);
        commandTimeouts.length = 0;
    }
}

function invokeStep(text, argument, stepKeyword) {
    const step = findStepDefinition(text, argument, stepKeyword);
    const { parameters } = step.getInvocationParameters({
        step: { text, argument },
        world: this
    });
    const { timeout } = step.options;
    if (timeout === undefined) {
        return step.code.apply(this, parameters);
    }
    return withCommandTimeout(timeout, () => step.code.apply(this, parameters));
}

export function executeStepByText(text, argument) {
    return invokeStep.call(this, text, argument);
}

export function logStepArgument(pickleStep) {
    if (pickleStep.argument && pickleStep.argument.dataTable) {
        Cypress.log({ displayName: 'DataTable', message: pickleStep.argument.dataTable });
    }
    if (pickleStep.argument && pickleStep.argument.docString) {
        Cypress.log({ displayName: 'Multiline', message: pickleStep.argument.docString.content });
    }
}

export function executePickleStep(pickleStep, world) {
    return invokeStep.call(world, pickleStep.text, pickleStep.argument, keyword(pickleStep));
}

export function createWorld() {
    const world = new (library().World)({
        log,
        attach,
        link
    });
    world.executeStep = executeStepByText;
    return world;
}

export function stepHookParams(gherkinDocument, pickle, pickleStep) {
    return {
        pickle,
        pickleStep,
        gherkinDocument,
        testCaseStartedId: pickle.id,
        testStepId: pickleStep.id
    };
}

export function runStepHooks(hooks, pickle, world, params) {
    for (const hook of hooks) {
        if (hook.appliesToTestCase(pickle)) {
            hook.code.apply(world, [params]);
        }
    }
}

/**
 * Status of finished mocha test
 */
export function testStatus(currentTest, stepStatus) {
    if (stepStatus) return stepStatus;
    if (currentTest.state === 'pending') return 'skipped';
    return currentTest.state ?? (currentTest.err ? 'failed' : 'passed');
}

/**
 * Whether failed mocha test is going to be retried
 */
export function willRetry(currentTest) {
    return (
        Boolean(currentTest.err) && currentTest.state !== 'passed' && currentTest.currentRetry() < currentTest._retries
    );
}
