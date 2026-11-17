// step definitions and hooks for capability features: expressions, outline, hooks, arguments
import {
    When,
    Then,
    Before,
    BeforeStep,
    AfterStep,
    After,
    defineParameterType
} from '../../../supportCodeLibrary/index.js';

function capture(world, ...values) {
    world.captured = [...(world.captured ?? []), ...values];
}

defineParameterType({
    name: 'bool',
    regexp: /true|false/,
    transformer: value => value === 'true'
});

defineParameterType({
    name: 'point',
    regexp: /\((\d+), ?(\d+)\)/,
    transformer: (x, y) => ({ x: Number(x), y: Number(y) }),
    useForSnippets: false
});

defineParameterType({
    name: 'worldProperty',
    regexp: /world\.(\w+)/,
    transformer(property) {
        return this[property];
    },
    useForSnippets: false
});

// expressions

When('I capture int {int}, float {float}, word {word} and string {string}', function (...values) {
    capture(this, ...values);
});

When('I capture anonymous {} and string {string}', function (anonymous, value) {
    capture(this, anonymous, value);
});

When('I eat {int} cucumber(s) for breakfast/lunch', function (count) {
    capture(this, count);
});

When('I capture escaped \\(literal\\) {int}', function (value) {
    capture(this, value);
});

When(/^I capture regexp (\d+)-(\w+)$/, function (number, word) {
    capture(this, number, word);
});

When('I capture point {point}', function (point) {
    capture(this, point);
});

When('I capture {worldProperty}', function (value) {
    capture(this, value);
});

When('I capture word {word}', function (value) {
    capture(this, value);
});

// arguments

When('I capture data table', function (dataTable) {
    capture(this, dataTable.rowsHash());
});

When('I capture data table rows', function (dataTable) {
    capture(this, dataTable.rows());
});

When('I capture doc string', function (docString) {
    capture(this, docString);
});

When('I capture json doc string', function (docString) {
    capture(this, JSON.parse(docString));
});

Then('captured values should be:', function (docString) {
    cy.wrap(this.captured).should('deep.equal', JSON.parse(docString));
});

Then('last captured value should equal doc string:', function (docString) {
    cy.wrap(this.captured[this.captured.length - 1]).should('equal', docString);
});

When('I execute {string} with doc string {string}', function (step, docString) {
    this.executeStep(step, docString);
});

When('I execute step {string}', function (step) {
    this.executeStep(step);
});

When('I attach named and data uri attachments', function () {
    this.attach('hello', { mediaType: 'text/plain', name: 'greeting.txt' });
    this.attach('data:text/plain;base64,aGVsbG8=');
    this.attach('data:application/json,{"key":"value"}', { name: 'data.json' });
});

// tags and hooks

const tagExpressions = ['@featureTag', '@ruleTag', '@hookA and not @hookB', '@hookOr1 or @hookOr2'];
for (const tags of tagExpressions) {
    Before({ tags }, function () {
        this.ranHooks = [...(this.ranHooks ?? []), tags];
    });
}

Then('hook for tag expression {string} should have run', function (tags) {
    cy.wrap(this.ranHooks ?? []).should('include', tags);
});

Then('hook for tag expression {string} should not have run', function (tags) {
    cy.wrap(this.ranHooks ?? []).should('not.include', tags);
});

Before({ tags: '@exampleTag' }, function () {
    this.exampleHook = true;
});

Then('example hook should have run: {bool}', function (ran) {
    cy.wrap(Boolean(this.exampleHook)).should('equal', ran);
});

// hooks record into the command queue, so the order is the same in describe and it modes
function record(world, entry) {
    cy.then(() => world.order.push(entry));
}

Before({ tags: '@order' }, function () {
    this.order = [];
    record(this, 'Before 1');
});

Before({ tags: '@order' }, function () {
    record(this, 'Before 2');
});

BeforeStep({ tags: '@order' }, function ({ pickleStep }) {
    record(this, `BeforeStep: ${pickleStep.text}`);
});

AfterStep({ tags: '@order' }, function ({ pickleStep }) {
    record(this, `AfterStep: ${pickleStep.text}`);
});

After({ tags: '@order' }, function ({ result }) {
    cy.then(() => {
        expect(result.status).to.equal('passed');
        expect(this.order).to.include('AfterStep: recorded order should be:');
    });
});

When('I record {string}', function (value) {
    record(this, `step: ${value}`);
});

Then('recorded order should be:', function (dataTable) {
    const expected = dataTable.raw().map(([entry]) => entry);
    cy.then(() => {
        expect(this.order).to.deep.equal(expected);
    });
});

Then('value from world should be {bool}', function (value) {
    cy.wrap(this.inWorld).should('equal', value);
});

Then('cypress config {word} should be {}', function (key, value) {
    cy.then(() => {
        expect(Cypress.config(key)).to.deep.equal(JSON.parse(value));
    });
});
