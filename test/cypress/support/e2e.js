import './hooks';
import { When, Given, Then } from '../../../index';

When(`open {string} url`, function (url){
    cy.visit(url);
});

When('simple step', function (){
    cy.log('passed')
});

Given(/data table step/, function (dataTable) {
    cy.log(dataTable);
});

Then('multiline step', function (multiline) {
    cy.log(multiline);
});

When('search {string}', function (searchTerm) {
    cy.get('#searchInput').type(searchTerm);
    cy.get('.suggestion-link').first().should('contain.text', searchTerm).click();
});

Then('title should be {string}', function (expectedTitle) {
    cy.get('.mw-page-title-main').first().should('contain.text', expectedTitle);
});

When('log', function () {
    cy.log('log', 'log');
});

When('fail', function (){
    throw new Error('intentional error');
});
