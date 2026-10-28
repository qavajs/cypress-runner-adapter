import { After, AfterStep, Before, BeforeStep, BeforeAll, AfterAll } from '../../../supportCodeLibrary/index.js';

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
        expect(params.gherkinDocument).to.have.nested.property('feature.name', 'test feature');
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

BeforeStep({ tags: '@tagged' }, function (params) {
    cy.log('before step tagged');
    cy.wrap(params).should((p) => {
        expect(p.gherkinDocument).to.have.nested.property('feature.name', 'test feature');
        expect(p.pickleStep).to.have.property('text');
        expect(p.testStepId).to.equal(p.pickleStep.id);
    });
});

AfterStep({ tags: '@tagged' }, function (params) {
    cy.log('after step tagged');
    cy.wrap(params).should((p) => {
        expect(p.pickleStep).to.have.property('text');
        expect(p.result.status).to.equal('passed');
        expect(p.result.duration).to.be.a('number');
    });
});

Before({ tags: '@pickleCheck' }, function ({ pickle }) {
    this.pickle = pickle;
});
