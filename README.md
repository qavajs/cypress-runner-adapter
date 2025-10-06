# @qavajs/cypress-runner-adapter
Adapter to run Gherkin tests via cypress test runner

## Installation

```
npm install @qavajs/cypress-runner-adapter
```

## Basic Configuration

```javascript
const { defineConfig } = require('cypress');
const cucumber = require('@qavajs/cypress-runner-adapter/adapter');

module.exports = defineConfig({
    e2e: {
        specPattern: 'cypress/feature/**/*.feature',
        supportFile: 'cypress/support/e2e.js',
        setupNodeEvents(on, config) {
            on('file:preprocessor', cucumber)
        },
    },
});
```

`support/e2e.js` is entry point with step definition;

```javascript
import { When, setWorldConstructor } from '@qavajs/cypress-runner-adapter';

class World {
    parameter = 42;
}

setWorldConstructor(World);

When('open {string} url', function (url) {
    cy.visit(url);
});
```

## Tags
Test can be filtered using Cucumber tag expressions provided via environment variable `TAGS`
```
TAGS='@first and @second' npx cypress run
```

## Translation Mode
Gherkin tests can be translated in different modes
- `describe` - default mode. Scenario will be translated as `describe`, each step will be translated as `it`
- `it` - Scenario will be translated as `it`

```bash
MODE=it npx cypress open
```
