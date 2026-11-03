import './hooks';
import './parameter_types';
import {
    When,
    Given,
    Then,
    After,
    AfterStep,
    setWorldConstructor,
    Template,
    World,
    WorldOptions,
    Pickle,
    TestCaseHookParams,
    TestStepHookParams
} from '../../../supportCodeLibrary/index';

class CustomWorld extends World {
    inWorld: boolean;
    pickle: Pickle;

    constructor(options: WorldOptions) {
        super(options);
        this.inWorld = false;
    }
}

setWorldConstructor(CustomWorld);

When(`open {string} url`, function (this: CustomWorld, url: string) {
    cy.visit(url);
});

When('simple step', function (this: CustomWorld) {
    cy.log('passed');
});

Given(/data table step/, function (this: CustomWorld, dataTable: any) {
    cy.log(dataTable);
});

Then('multiline step', function (this: CustomWorld, multiline: string) {
    cy.log(multiline);
});

When('search {string}', function (this: CustomWorld, searchTerm: string) {
    cy.get('#search').type(searchTerm);
    cy.get('[role="option"]').first().should('contain.text', searchTerm).click();
});

Then('title should be {string}', function (this: CustomWorld, expectedTitle: string) {
    cy.get('.page-title').first().should('be.visible').should('contain.text', expectedTitle);
});

When('log', function (this: CustomWorld) {
    cy.log('log', 'log');
});

When('fail', function (this: CustomWorld) {
    cy.wrap(1).should('equal', 2);
});

When('modify value from world', function (this: CustomWorld) {
    this.inWorld = true;
});

When('check value from world', function (this: CustomWorld) {
    cy.wrap(this.inWorld).should('be.true');
});

When('print {color}', function (this: CustomWorld, color: { color: string; hex: string }) {
    cy.log(JSON.stringify(color));
});

When('execute step', function (this: CustomWorld) {
    this.executeStep('simple step');
});

When(
    'template step',
    Template(
        () => `
    simple step
    log
`
    )
);

When(
    'search in catalog {string}',
    Template(
        (term: string) => `
    open 'test/fixtures/search.html' url
    search '${term}'
`
    )
);

When('log {string}', function (this: CustomWorld, value: string) {
    cy.log(value);
});

When('world log {string}', function (this: CustomWorld, value: string) {
    this.log(value);
});

Given('data table hashes step', function (this: CustomWorld, dataTable: any) {
    const hashes = dataTable.hashes();
    cy.wrap(hashes).should('deep.equal', [
        { name: 'first', value: 'one' },
        { name: 'second', value: 'two' }
    ]);
});

Given('data table rows hash step', function (this: CustomWorld, dataTable: any) {
    const hash = dataTable.rowsHash();
    cy.wrap(hash).should('deep.equal', { first: 'one', second: 'two' });
});

Given('data table rows step', function (this: CustomWorld, dataTable: any) {
    const rows = dataTable.rows();
    cy.wrap(rows).should('deep.equal', [
        ['value1', 'value2'],
        ['value3', 'value4']
    ]);
});

Given('data table transpose step', function (this: CustomWorld, dataTable: any) {
    const transposed = dataTable.transpose();
    cy.wrap(transposed.raw()).should('deep.equal', [
        ['a', '1'],
        ['b', '2'],
        ['c', '3']
    ]);
});

When('attach value', function (this: CustomWorld) {
    this.attach('attachment content');
});

When('attach value with mime type', function (this: CustomWorld) {
    this.attach('{"key":"value"}', 'application/json');
});

When('link value', function (this: CustomWorld) {
    this.link('https://example.com');
});

When('pending step', function (this: CustomWorld) {
    return 'pending';
});

When('skipped step', function (this: CustomWorld) {
    return 'skipped';
});

Then('current scenario should have {int} steps', function (this: CustomWorld, count: number) {
    cy.wrap(this.pickle.steps.length).should('equal', count);
});

// state shared between retry attempts
let attempts = 0;
const retryReport: {
    afterStep: { text: string; status: string }[];
    after: { status: string; willBeRetried: boolean }[];
} = { afterStep: [], after: [] };

AfterStep({ tags: '@retry' }, function ({ pickleStep, result }: TestStepHookParams) {
    retryReport.afterStep.push({ text: pickleStep.text, status: result.status });
});

After({ tags: '@retry' }, function ({ result, willBeRetried }: TestCaseHookParams) {
    retryReport.after.push({ status: result.status, willBeRetried });
});

When('fail on first attempt', function () {
    attempts++;
    if (attempts === 1) {
        cy.then(() => {
            throw new Error('first attempt failure');
        });
    }
});

Then('retry should have been reported', function () {
    cy.then(() => {
        const failedSteps = retryReport.afterStep.filter(step => step.status === 'failed');
        expect(failedSteps.map(step => step.text)).to.deep.equal(['fail on first attempt']);
        // After hook runs per attempt only in 'it' mode
        if (retryReport.after.length > 0) {
            expect(retryReport.after[0]).to.deep.equal({ status: 'failed', willBeRetried: true });
        }
    });
});

When('step with timeout', { timeout: 1234 }, function () {
    cy.then(() => {
        expect(Cypress.config('defaultCommandTimeout')).to.equal(1234);
    });
});

Then('command timeout should be restored', function () {
    cy.then(() => {
        expect(Cypress.config('defaultCommandTimeout')).to.equal(4000);
    });
});

Then<CustomWorld, [number]>('viewport width should be {int}', function (width) {
    cy.then(() => {
        expect(Cypress.config('viewportWidth')).to.equal(width);
    });
});
