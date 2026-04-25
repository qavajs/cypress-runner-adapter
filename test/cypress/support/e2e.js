import './hooks';
import './parameter_types';
import { When, Given, Then, setWorldConstructor, Template, World } from '../../../supportCodeLibrary/index';

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
    cy.get('#p-search input[type="search"]').type(searchTerm);
    cy.get('[role="option"]').first().should('contain.text', searchTerm).click();
});

Then('title should be {string}', function (expectedTitle) {
    cy.get('.mw-content-container .mw-page-title-main')
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

When('search in wikipedia {string}', Template(term => `
    open 'https://en.wikipedia.org/' url
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

When('link value', function () {
    this.link('https://example.com');
});