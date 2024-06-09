# @qavajs/cypress-runner-adapter
Adapter to run cucumberjs tests via cypress test runner

## Installation

`npm install @qavajs/cypress-runner-adapter`

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
    
}
setWorldConstructor(World);

When('open {string} url', function (url) {
    cy.visit(url);
});
```
