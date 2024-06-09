import {After, AfterStep, Before, BeforeStep} from '../../../index';

BeforeStep(function (obj) {
    cy.log(obj);
});

AfterStep(function (obj) {
    cy.log(obj);
});

Before(function (obj) {
    cy.log(obj);
});

Before({ tags: '@tagged' }, function (obj) {
    cy.log(obj);
});

After(function (obj) {
    cy.log(obj);
});
