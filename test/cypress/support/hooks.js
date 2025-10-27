import { After, AfterStep, Before, BeforeStep, BeforeAll, AfterAll } from '../../../index';

BeforeAll(function () {
    cy.log('before all hook');
});

BeforeStep(function (obj) {
    cy.log('before step');
    cy.log(obj);
});

AfterStep(function (obj) {
    cy.log('after step');
    cy.log(obj);
});

Before(function (obj) {
    cy.log('before');
    cy.log(obj);
});

Before({ tags: '@tagged' }, function (obj) {
    cy.log('before tagged');
    cy.log(obj);
});

After(function (obj) {
    cy.log('after');
    cy.log(obj);
});

AfterAll(function () {
    cy.log('after all hook');
});
