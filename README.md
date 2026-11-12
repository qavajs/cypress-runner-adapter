# @qavajs/cypress-runner-adapter

Cypress preprocessor that compiles Gherkin `.feature` files into Cypress/Mocha test suites, enabling full BDD-style testing with Cucumber syntax inside Cypress.

[![npm](https://img.shields.io/npm/v/@qavajs/cypress-runner-adapter)](https://www.npmjs.com/package/@qavajs/cypress-runner-adapter)
[![license](https://img.shields.io/npm/l/@qavajs/cypress-runner-adapter)](LICENSE)
[![Pull Request](https://github.com/qavajs/cypress-runner-adapter/actions/workflows/pull-request.yml/badge.svg)](https://github.com/qavajs/cypress-runner-adapter/actions/workflows/pull-request.yml)

## Installation

```
npm install @qavajs/cypress-runner-adapter
```

## Configuration

Register the preprocessor in `cypress.config.js`:

```javascript
import { defineConfig } from 'cypress';
import cucumber from '@qavajs/cypress-runner-adapter/adapter';

export default defineConfig({
    e2e: {
        specPattern: 'cypress/feature/**/*.feature',
        supportFile: 'cypress/support/e2e.js',
        setupNodeEvents(on, config) {
            on('file:preprocessor', cucumber);
        },
    },
});
```

The package is ESM-only. CommonJS configs (`require(...)`) work on Node.js 22+ via `require(esm)`.

### Options

`setupCucumber` registers the preprocessor and enables features that need access to Cypress config:

```javascript
import { defineConfig } from 'cypress';
import { setupCucumber } from '@qavajs/cypress-runner-adapter/adapter';

export default defineConfig({
    e2e: {
        specPattern: 'cypress/feature/**/*.feature',
        supportFile: 'cypress/support/e2e.js',
        setupNodeEvents(on, config) {
            return setupCucumber(on, config, {
                mode: 'describe',                    // 'describe' | 'it', default: MODE env variable or 'describe'
                tags: '@smoke',                      // default: TAGS Cypress env (--env TAGS=...), then TAGS env variable
                messages: 'reports/messages.ndjson', // optional Cucumber messages report
                scenarioSpecs: true                  // list each scenario as a separate spec in `cypress open`, default: SCENARIO_SPECS Cypress env, then SCENARIO_SPECS env variable
            });
        },
    },
});
```

Compared to registering the preprocessor directly, `setupCucumber`:
- excludes feature files without scenarios matching `tags`, so Cypress does not open a browser for them;
- writes a [Cucumber messages](#reports) report when `messages` is set;
- lists each scenario as a separate spec in `cypress open` when `scenarioSpecs` is set (see [Scenario Specs](#scenario-specs)).

`setupNodeEvents` must return the config returned by `setupCucumber`.

`createCucumberPreprocessor({ mode, tags })` creates just the preprocessor, if you need to combine it with another one.

Feature files are watched in `cypress open`, so edits rerun the spec automatically.

### TypeScript

TypeScript support is built-in. Point `supportFile` at a `.ts` file and the adapter will compile it automatically:

```javascript
import { defineConfig } from 'cypress';
import cucumber from '@qavajs/cypress-runner-adapter/adapter';

export default defineConfig({
    e2e: {
        specPattern: 'cypress/feature/**/*.feature',
        supportFile: 'cypress/support/e2e.ts',
        setupNodeEvents(on, config) {
            on('file:preprocessor', cucumber);
        },
    },
});
```

```typescript
// cypress/support/e2e.ts
import { Given, When, Then, setWorldConstructor, World, WorldOptions } from '@qavajs/cypress-runner-adapter';

class CustomWorld extends World {
    myValue: string | null;

    constructor(options: WorldOptions) {
        super(options);
        this.myValue = null;
    }
}

setWorldConstructor(CustomWorld);

Given('I navigate to {string}', function (this: CustomWorld, url: string) {
    cy.visit(url);
});
```

A `tsconfig.json` is not required but recommended. Support files are transpiled with esbuild, so type errors will not block the test run — run `tsc --noEmit` separately to type check.

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

### Step Options

Steps accept an optional options object. `timeout` sets the Cypress command timeout (`defaultCommandTimeout`) for commands of this step.
It limits each command, not the total duration of the step:

```javascript
When('I wait for report generation', { timeout: 60000 }, function () {
    cy.get('.report').should('be.visible');
});
```

`setDefaultTimeout(ms)` changes `defaultCommandTimeout` for all steps the same way.

TypeScript users can type step arguments via generics:

```typescript
When<CustomWorld, [string, number]>('I add {string} {int} times', function (item, count) {
    // item: string, count: number
});
```

## Hooks

All standard Cucumber hooks are supported. Hooks receive a `params` object with context about the current test.

| Hook | Params |
|---|---|
| `Before` | `gherkinDocument`, `pickle`, `testCaseStartedId`, `willBeRetried` |
| `After` | `gherkinDocument`, `pickle`, `testCaseStartedId`, `willBeRetried`, `result`, `error` |
| `BeforeStep` | `gherkinDocument`, `pickle`, `pickleStep`, `testCaseStartedId`, `testStepId` |
| `AfterStep` | `gherkinDocument`, `pickle`, `pickleStep`, `testCaseStartedId`, `testStepId`, `result`, `error` |

`result` is `{ status, duration, message, exception }`, where `duration` is in milliseconds. `error` is the same as `result.exception`.
`tags` option filters hooks by scenario tags, for step hooks as well.

`BeforeAll` and `AfterAll` run once per feature file, because Cypress runs every spec file in isolation.

```javascript
import { Before, After, BeforeStep, AfterStep, BeforeAll, AfterAll } from '@qavajs/cypress-runner-adapter';

BeforeAll(function () {
    // runs once before all tests of a feature file
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

BeforeStep(function ({ pickleStep, testStepId }) {
    // runs before each step
});

BeforeStep({ tags: '@login' }, function () {
    // runs before each step of scenarios tagged with @login
});

AfterStep(function ({ result }) {
    // runs after each step
});

After(function ({ result, error }) {
    // runs after each scenario
});

AfterAll(function () {
    // runs once after all tests of a feature file
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
| `this.attach(data, mediaType)` | Attach data to the test report; `mediaType` is a MIME type string or `{ mediaType, name }` |
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

## Special Tags

| Tag | Effect |
|---|---|
| `@only` | Run only scenarios tagged with `@only` in the spec (`describe.only` / `it.only`) |
| `@skip` | Skip scenario (`describe.skip` / `it.skip`) |
| `@<config>(<value>)` | Override Cypress test configuration, e.g. `@retries(2)`, `@viewportWidth(800)`, `@defaultCommandTimeout(10000)` |

Configuration tags accept any option known to `Cypress.config()`; values are parsed as JSON, otherwise passed as strings.
Options that Cypress allows only at suite level (e.g. `testIsolation`) work only in `describe` mode.

## Errors

Failures of steps and hooks include the feature file location:

```
AssertionError: expected 1 to equal 2

    at cypress/feature/login.feature:12
```

Gherkin syntax errors include the path of the feature file.

## Undefined Steps

When a step has no matching definition, the test fails with a ready-to-use snippet:

```
Step 'I open "home" page' is not defined. Implement it with the snippet below:

When('I open {string} page', function (string) {
    // Write code here that turns the phrase above into concrete actions
    return 'pending';
});
```

## Tag Filtering

Filter scenarios using Cucumber tag expressions via the `TAGS` environment variable:

```bash
TAGS='@smoke' npx cypress run
TAGS='@smoke and not @slow' npx cypress run
TAGS='@login or @auth' npx cypress run
```

Alternatively pass `tags` to `createCucumberPreprocessor` (see [Options](#options)).

## Scenario Specs

Cypress lists and runs whole spec files. To run a single scenario from the Cypress UI, enable `scenarioSpecs`:

```javascript
setupNodeEvents(on, config) {
    return setupCucumber(on, config, { scenarioSpecs: true });
}
```

In `cypress open` the adapter generates a `.scenario` spec per scenario (and per Scenario Outline example row)
in `cypress/scenarios/<feature path>/` and lists them instead of `.feature` files:

```
cypress/scenarios/cypress/feature/login.feature/
├── successful login.scenario
├── login with user admin.scenario
└── login with user guest.scenario
```

- spec names are scenario names with characters that are special in file names or globs (`/`, `(`, `[`, `,`, ...) replaced by `_`;
  duplicates (e.g. outline rows without `<placeholders>` in the title) are numbered `name - 1`, `name - 2`;
- specs are kept in sync with feature files: added, renamed and removed scenarios appear in the list immediately,
  and editing a feature reruns the opened scenario;
- only scenarios matching `tags` are listed;
- `cypress run` is not affected and still runs whole feature files.

Pass a string to change the directory, e.g. `scenarioSpecs: 'tmp/scenarios'` (relative to project root).

Without the option, the `SCENARIO_SPECS` Cypress env, then the `SCENARIO_SPECS` environment variable is used
(`true`/`1` enables the default directory, `false`/`0` disables, any other value is a directory):

```bash
SCENARIO_SPECS=true npx cypress open
npx cypress open --env SCENARIO_SPECS=tmp/scenarios
```
Generated specs should not be committed — add the directory to `.gitignore`.
`BeforeAll`/`AfterAll` hooks and `Background` run for each scenario spec.

## Reports

With `messages` option `setupCucumber` writes a [Cucumber messages](https://github.com/cucumber/messages) NDJSON report,
compatible with standard Cucumber formatters (HTML, JUnit, JSON, Allure, ...).
`this.log`, `this.attach` and `this.link` are included as attachments.

```javascript
setupNodeEvents(on, config) {
    return setupCucumber(on, config, { messages: 'reports/messages.ndjson' });
}
```

The report is finalized on `after:run`, so it is complete in `cypress run`.
Cypress keeps only the last handler of `before:run`/`after:run` events — if your config registers them too,
use a plugin that allows multiple handlers (e.g. `cypress-on-fix`).

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

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for running the test suite locally.