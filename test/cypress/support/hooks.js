import {After, AfterStep, Before, BeforeStep} from '../../../supportCodeLibrary';

BeforeStep(function () {
    cy.log('Before Step');
});

// AfterStep(function () {
//     cy.log('After Step');
// });

Before(function () {
    cy.log('Before');
});

Before({ tags: '@tagged', name: 'Name hook' }, function () {
    cy.log('Before');
});

After(function () {
    cy.log('After');
});
