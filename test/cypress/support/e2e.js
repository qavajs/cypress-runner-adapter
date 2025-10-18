import './hooks';
import './parameter_types';
import { When, Given, Then, setWorldConstructor, Template } from '../../../index';

class World {
    constructor() {
        this.inWorld = false;
    }
}

setWorldConstructor(World);

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