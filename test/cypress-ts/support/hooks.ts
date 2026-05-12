import { After, AfterStep, Before, BeforeStep, BeforeAll, AfterAll, TestCaseHookParams, TestStepHookParams } from '../../../supportCodeLibrary/index';

BeforeAll(function () {
    cy.log('before all hook');
});

BeforeStep(function (params: TestStepHookParams) {
    cy.log('before step');
});

AfterStep(function (params: TestStepHookParams) {
    cy.log('after step');
});

Before(function (params: TestCaseHookParams) {
    cy.log('before');
});

Before({ tags: '@tagged' }, function (params: TestCaseHookParams) {
    cy.log('before tagged');
    cy.wrap(params).should((p: TestCaseHookParams) => {
        expect(p).to.have.property('gherkinDocument');
        expect(p).to.have.property('pickle');
        expect(p.error).to.be.undefined;
        expect(p.willBeRetried).to.equal(false);
        expect(p).to.have.property('testCaseStartedId');
    });
});

After({ tags: '@tagged' }, function (params: TestCaseHookParams) {
    cy.log('after tagged');
    cy.wrap(params).should((p: TestCaseHookParams) => {
        expect(p).to.have.property('gherkinDocument');
        expect(p).to.have.property('pickle');
        expect(p).to.have.property('result');
        expect(p.error).to.be.undefined;
        expect(p.willBeRetried).to.equal(false);
        expect(p).to.have.property('testCaseStartedId');
    });
});

After(function (params: TestCaseHookParams) {
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
