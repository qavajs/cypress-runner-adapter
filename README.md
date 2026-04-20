# @qavajs/cypress-runner-adapter

Cypress preprocessor that compiles Gherkin `.feature` files into Cypress/Mocha test suites, enabling full BDD-style testing with Cucumber syntax inside Cypress.

[![npm](https://img.shields.io/npm/v/@qavajs/cypress-runner-adapter)](https://www.npmjs.com/package/@qavajs/cypress-runner-adapter)
[![license](https://img.shields.io/npm/l/@qavajs/cypress-runner-adapter)](LICENSE)

## Installation

```
npm install @qavajs/cypress-runner-adapter
```

## Configuration

Register the preprocessor in `cypress.config.js`:

```javascript
const { defineConfig } = require('cypress');
const cucumber = require('@qavajs/cypress-runner-adapter/adapter');

module.exports = defineConfig({
    e2e: {
        specPattern: 'cypress/feature/**/*.feature',
        supportFile: 'cypress/support/e2e.js',
        setupNodeEvents(on, config) {
            on('file:preprocessor', cucumber);
        },
    },
});
```

## Step Definitions

Define steps in your support file (e.g. `cypress/support/e2e.js`):

```javascript
import { Given, When, Then, setWorldConstructor, World } from '@qavajs/cypress-runner-adapter';

class CustomWorld extends World {
    constructor(options) {
        super(options);
        this.myValue = null;
    }
}

setWorldConstructor(CustomWorld);

Given('I navigate to {string}', function (url) {
    cy.visit(url);
});

When('I click {string}', function (selector) {
    cy.get(selector).click();
});

Then('{string} should be visible', function (selector) {
    cy.get(selector).should('be.visible');
});
```

## Hooks

All standard Cucumber hooks are supported. Hooks receive a `params` object with context about the current test.

```javascript
import { Before, After, BeforeStep, AfterStep, BeforeAll, AfterAll } from '@qavajs/cypress-runner-adapter';

BeforeAll(function () {
    // runs once before all tests
});

Before(function ({ gherkinDocument, pickle, testCaseStartedId }) {
    // runs before each scenario
});

Before({ tags: '@login' }, function () {
    // runs before scenarios tagged with @login
});

Before({ name: 'setup' }, function () {
    // named hook
});

BeforeStep(function ({ testStepId }) {
    // runs before each step
});

AfterStep(function ({ result }) {
    // runs after each step
});

After(function ({ result, error }) {
    // runs after each scenario
});

AfterAll(function () {
    // runs once after all tests
});
```

## Parameter Types

Define custom parameter types using `defineParameterType`:

```javascript
import { defineParameterType } from '@qavajs/cypress-runner-adapter';

defineParameterType({
    name: 'color',
    regexp: /(red|blue|green)/,
    transformer: color => color.toUpperCase()
});

// usage in step definition:
// When('I select {color} theme', function (color) { ... });
```

## World

The `World` class is instantiated for each scenario and is available as `this` inside step definitions and hooks. Extend it to share state across steps within a scenario.

| Property / Method | Description |
|---|---|
| `this.log(message)` | Log a message to the Cypress command log |
| `this.attach(data)` | Attach data to the test report |
| `this.link(url)` | Attach a link to the test report |
| `this.executeStep(text)` | Programmatically execute a step by its text |

```javascript
import { When, World, setWorldConstructor } from '@qavajs/cypress-runner-adapter';

class AppWorld extends World {
    constructor(options) {
        super(options);
        this.userId = null;
    }
}

setWorldConstructor(AppWorld);

When('I store user {string}', function (id) {
    this.userId = id;
});

When('I use stored user', function () {
    cy.log(this.userId);
});

When('I execute another step', function () {
    this.executeStep('I navigate to "https://example.com"');
});
```

## Template Steps

`Template` composes a step from other steps using a multiline string. The function receives the same arguments as the step and returns the steps to execute:

```javascript
import { When, Template } from '@qavajs/cypress-runner-adapter';

When('I search for {string} on Wikipedia', Template(term => `
    I navigate to 'https://en.wikipedia.org/'
    I search '${term}'
`));
```

## Tag Filtering

Filter scenarios using Cucumber tag expressions via the `TAGS` environment variable:

```bash
TAGS='@smoke' npx cypress run
TAGS='@smoke and not @slow' npx cypress run
TAGS='@login or @auth' npx cypress run
```

## Translation Modes

Controls how Gherkin scenarios are mapped to Mocha constructs. Set via the `MODE` environment variable.

| Mode | Scenario maps to | Steps map to |
|---|---|---|
| `describe` (default) | `describe` | `it` |
| `it` | `it` | _(inline)_ |

```bash
# default (describe) mode
npx cypress run

# it mode
MODE=it npx cypress run
MODE=it npx cypress open
```