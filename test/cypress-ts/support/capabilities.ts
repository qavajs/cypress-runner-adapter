// step definitions and hooks for capability features: expressions, outline, hooks, arguments
import {
    When,
    Then,
    Before,
    BeforeStep,
    AfterStep,
    After,
    defineParameterType,
    DataTable,
    World,
    TestCaseHookParams,
    TestStepHookParams
} from '../../../supportCodeLibrary/index';

type CapabilitiesWorld = World & {
    captured?: unknown[];
    ranHooks?: string[];
    order?: string[];
    exampleHook?: boolean;
    inWorld?: boolean;
};

function capture(world: CapabilitiesWorld, ...values: unknown[]) {
    world.captured = [...(world.captured ?? []), ...values];
}

defineParameterType<boolean>({
    name: 'bool',
    regexp: /true|false/,
    transformer: value => value === 'true'
});

defineParameterType<{ x: number; y: number }>({
    name: 'point',
    regexp: /\((\d+), ?(\d+)\)/,
    transformer: (x, y) => ({ x: Number(x), y: Number(y) }),
    useForSnippets: false
});

defineParameterType<unknown, CapabilitiesWorld>({
    name: 'worldProperty',
    regexp: /world\.(\w+)/,
    transformer(property) {
        return this[property as keyof CapabilitiesWorld];
    },
    useForSnippets: false
});

// expressions

When<CapabilitiesWorld, [number, number, string, string]>(
    'I capture int {int}, float {float}, word {word} and string {string}',
    function (...values) {
        capture(this, ...values);
    }
);

When<CapabilitiesWorld, [string, string]>('I capture anonymous {} and string {string}', function (anonymous, value) {
    capture(this, anonymous, value);
});

When<CapabilitiesWorld, [number]>('I eat {int} cucumber(s) for breakfast/lunch', function (count) {
    capture(this, count);
});

When<CapabilitiesWorld, [number]>('I capture escaped \\(literal\\) {int}', function (value) {
    capture(this, value);
});

When<CapabilitiesWorld, [string, string]>(/^I capture regexp (\d+)-(\w+)$/, function (number, word) {
    capture(this, number, word);
});

When<CapabilitiesWorld, [{ x: number; y: number }]>('I capture point {point}', function (point) {
    capture(this, point);
});

When<CapabilitiesWorld, [unknown]>('I capture {worldProperty}', function (value) {
    capture(this, value);
});

When<CapabilitiesWorld, [string]>('I capture word {word}', function (value) {
    capture(this, value);
});

// arguments

When<CapabilitiesWorld, [DataTable]>('I capture data table', function (dataTable) {
    capture(this, dataTable.rowsHash());
});

When<CapabilitiesWorld, [DataTable]>('I capture data table rows', function (dataTable) {
    capture(this, dataTable.rows());
});

When<CapabilitiesWorld, [string]>('I capture doc string', function (docString) {
    capture(this, docString);
});

When<CapabilitiesWorld, [string]>('I capture json doc string', function (docString) {
    capture(this, JSON.parse(docString));
});

Then<CapabilitiesWorld, [string]>('captured values should be:', function (docString) {
    cy.wrap(this.captured).should('deep.equal', JSON.parse(docString));
});

Then<CapabilitiesWorld, [string]>('last captured value should equal doc string:', function (docString) {
    cy.wrap(this.captured[this.captured.length - 1]).should('equal', docString);
});

When<CapabilitiesWorld, [string, string]>('I execute {string} with doc string {string}', function (step, docString) {
    this.executeStep(step, docString);
});

When<CapabilitiesWorld, [string]>('I execute step {string}', function (step) {
    this.executeStep(step);
});

When<CapabilitiesWorld>('I attach named and data uri attachments', function () {
    this.attach('hello', { mediaType: 'text/plain', name: 'greeting.txt' });
    this.attach('data:text/plain;base64,aGVsbG8=');
    this.attach('data:application/json,{"key":"value"}', { name: 'data.json' });
});

// tags and hooks

const tagExpressions = ['@featureTag', '@ruleTag', '@hookA and not @hookB', '@hookOr1 or @hookOr2'];
for (const tags of tagExpressions) {
    Before({ tags }, function (this: CapabilitiesWorld) {
        this.ranHooks = [...(this.ranHooks ?? []), tags];
    });
}

Then<CapabilitiesWorld, [string]>('hook for tag expression {string} should have run', function (tags) {
    cy.wrap(this.ranHooks ?? []).should('include', tags);
});

Then<CapabilitiesWorld, [string]>('hook for tag expression {string} should not have run', function (tags) {
    cy.wrap(this.ranHooks ?? []).should('not.include', tags);
});

Before({ tags: '@exampleTag' }, function (this: CapabilitiesWorld) {
    this.exampleHook = true;
});

Then<CapabilitiesWorld, [boolean]>('example hook should have run: {bool}', function (ran) {
    cy.wrap(Boolean(this.exampleHook)).should('equal', ran);
});

// hooks record into the command queue, so the order is the same in describe and it modes
function record(world: CapabilitiesWorld, entry: string) {
    cy.then(() => world.order.push(entry));
}

Before({ tags: '@order' }, function (this: CapabilitiesWorld) {
    this.order = [];
    record(this, 'Before 1');
});

Before({ tags: '@order' }, function (this: CapabilitiesWorld) {
    record(this, 'Before 2');
});

BeforeStep({ tags: '@order' }, function (this: CapabilitiesWorld, { pickleStep }: TestStepHookParams) {
    record(this, `BeforeStep: ${pickleStep.text}`);
});

AfterStep({ tags: '@order' }, function (this: CapabilitiesWorld, { pickleStep }: TestStepHookParams) {
    record(this, `AfterStep: ${pickleStep.text}`);
});

After({ tags: '@order' }, function (this: CapabilitiesWorld, { result }: TestCaseHookParams) {
    cy.then(() => {
        expect(result.status).to.equal('passed');
        expect(this.order).to.include('AfterStep: recorded order should be:');
    });
});

When<CapabilitiesWorld, [string]>('I record {string}', function (value) {
    record(this, `step: ${value}`);
});

Then<CapabilitiesWorld, [DataTable]>('recorded order should be:', function (dataTable) {
    const expected = dataTable.raw().map(([entry]) => entry);
    cy.then(() => {
        expect(this.order).to.deep.equal(expected);
    });
});

Then<CapabilitiesWorld, [boolean]>('value from world should be {bool}', function (value) {
    cy.wrap(this.inWorld).should('equal', value);
});

Then<CapabilitiesWorld, [string, string]>('cypress config {word} should be {}', function (key, value) {
    cy.then(() => {
        expect(Cypress.config(key as keyof Cypress.Config)).to.deep.equal(JSON.parse(value));
    });
});
