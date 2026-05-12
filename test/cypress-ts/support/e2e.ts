import './hooks';
import './parameter_types';
import { When, Given, Then, setWorldConstructor, Template, World, WorldOptions } from '../../../supportCodeLibrary/index';

class CustomWorld extends World {
    inWorld: boolean;

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
    cy.get('#p-search input[type="search"]').type(searchTerm);
    cy.get('[role="option"]').first().should('contain.text', searchTerm).click();
});

Then('title should be {string}', function (this: CustomWorld, expectedTitle: string) {
    cy.get('.mw-content-container .mw-page-title-main')
        .first()
        .should('be.visible')
        .should('contain.text', expectedTitle);
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

When('template step', Template(() => `
    simple step
    log
`));

When('search in wikipedia {string}', Template((term: string) => `
    open 'https://en.wikipedia.org/' url
    search '${term}'
`));

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
