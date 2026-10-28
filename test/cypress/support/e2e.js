import './hooks.js';
import './parameter_types.js';
import { When, Given, Then, After, AfterStep, setWorldConstructor, Template, World } from '../../../supportCodeLibrary/index.js';

class CustomWorld extends World {
    constructor(options) {
        super(options);
        this.inWorld = false;
    }
}

setWorldConstructor(CustomWorld);

When(`open {string} url`, function (url){
    cy.visit(url);
});

When('simple step', function (){
    cy.log('passed');
});

Given(/data table step/, function (dataTable) {
    cy.log(dataTable);
});

Then('multiline step', function (multiline) {
    cy.log(multiline);
});

When('search {string}', function (searchTerm) {
    cy.get('#search').type(searchTerm);
    cy.get('[role="option"]').first().should('contain.text', searchTerm).click();
});

Then('title should be {string}', function (expectedTitle) {
    cy.get('.page-title')
        .first()
        .should('be.visible')
        .should('contain.text', expectedTitle);
});

When('log', function () {
    cy.log('log', 'log');
});

When('fail', function (){
    cy.wrap(1).should('equal', 2);
});

When('modify value from world', function (){
    this.inWorld = true;
});

When('check value from world', function (){
    cy.wrap(this.inWorld).should('be.true');
});

When('print {color}', function (color) {
    cy.log(color);
});

When('execute step', function () {
    this.executeStep('simple step');
});

When('template step', Template(() => `
    simple step
    log
`));

When('search in catalog {string}', Template(term => `
    open 'test/fixtures/search.html' url
    search '${term}'
`));

When('log {string}', function (value) {
    cy.log(value);
});

When('world log {string}', function (value) {
    this.log(value);
});

Given('data table hashes step', function (dataTable) {
    const hashes = dataTable.hashes();
    cy.wrap(hashes).should('deep.equal', [
        { name: 'first', value: 'one' },
        { name: 'second', value: 'two' }
    ]);
});

Given('data table rows hash step', function (dataTable) {
    const hash = dataTable.rowsHash();
    cy.wrap(hash).should('deep.equal', { first: 'one', second: 'two' });
});

Given('data table rows step', function (dataTable) {
    const rows = dataTable.rows();
    cy.wrap(rows).should('deep.equal', [
        ['value1', 'value2'],
        ['value3', 'value4']
    ]);
});

Given('data table transpose step', function (dataTable) {
    const transposed = dataTable.transpose();
    cy.wrap(transposed.raw()).should('deep.equal', [
        ['a', '1'],
        ['b', '2'],
        ['c', '3']
    ]);
});

When('attach value', function () {
    this.attach('attachment content');
});

When('attach value with mime type', function () {
    this.attach('{"key":"value"}', 'application/json');
});

When('link value', function () {
    this.link('https://example.com');
});

When('pending step', function () {
    return 'pending';
});

When('skipped step', function () {
    return 'skipped';
});

Then('current scenario should have {int} steps', function (count) {
    cy.wrap(this.pickle.steps.length).should('equal', count);
});

// state shared between retry attempts
let attempts = 0;
const retryReport = { afterStep: [], after: [] };

AfterStep({ tags: '@retry' }, function ({ pickleStep, result }) {
    retryReport.afterStep.push({ text: pickleStep.text, status: result.status });
});

After({ tags: '@retry' }, function ({ result, willBeRetried }) {
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

Then('viewport width should be {int}', function (width) {
    cy.then(() => {
        expect(Cypress.config('viewportWidth')).to.equal(width);
    });
});
