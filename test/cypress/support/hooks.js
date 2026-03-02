import { After, AfterStep, Before, BeforeStep, BeforeAll, AfterAll } from '../../../index';

BeforeAll(function () {
    cy.log('before all hook');
});

BeforeStep(function (params) {
    cy.log('before step');
});

AfterStep(function (params) {
    cy.log('after step');
});

Before(function (params) {
    cy.log('before');
});

Before({ tags: '@tagged' }, function (params) {
    cy.log('before tagged');
    cy.wrap(params).should((params) => {
        expect(params).to.have.property('gherkinDocument');
        expect(params).to.have.property('pickle');
        expect(params.error).to.be.undefined;
        expect(params.willBeRetried).to.equal(false);
        expect(params).to.have.property('testCaseStartedId');
    });
});

After({ tags: '@tagged' }, function (params) {
    cy.log('after tagged');
    cy.wrap(params).should((params) => {
        expect(params).to.have.property('gherkinDocument');
        expect(params).to.have.property('pickle');
        expect(params).to.have.property('result');
        expect(params.error).to.be.undefined;
        expect(params.willBeRetried).to.equal(false);
        expect(params).to.have.property('testCaseStartedId');
    });
});

After(function (params) {
    cy.log('after');
});

AfterAll(function () {
    cy.log('after all hook');
});

Before({ name: 'named before' }, function () {
    cy.log('named before hook');
});

After({ name: 'named after' }, function () {
    cy.log('named after hook');
});