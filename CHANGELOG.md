# Change Log

All notable changes to the "@qavajs/cypress-runner-adapter" will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

:rocket: - new feature

:beetle: - bugfix

:x: - deprecation/removal

:pencil: - chore

:microscope: - experimental

## [1.7.0]
- :rocket: updated @cucumber/cucumber-expressions, @cucumber/gherkin, @cucumber/tag-expressions

## [1.6.0]
- :rocket: updated logs for Gherkin steps
- :rocket: improved multi line and data table step logging

## [1.5.0]
- :rocket: added `world.log` method
- :rocket: updated test.body to render corresponding step code

## [1.4.2]
- :pencil: updated to cypress 15.7.0
- :pencil: updated to gherkin to 37.0.0

## [1.4.1]
- :beetle: fixed `result` property in `After` and `AfterStep` hooks
- :rocket: added workaround to complete `AfterStep` hook in case of step fail

## [1.4.0]
- :rocket: added `Template` utility function
```typescript
import { When, Template } from '@qavajs/playwright-runner-adapter';

When('I click {string} and verify {string}', Template((locator, expected) => `
    I click '${locator}'
    I expect '${locator} > Value' to equal '${expected}'
`));
```

## [1.3.0]
- :rocket: added tags support
- :rocket: added alternative 'it mode' to translate gherkin tests to mocha `it` instead of `describe`
```bash
MODE=it npx cypress open
```

## [1.2.1]
- :pencil: updated to cypress 15.3

## [1.2.0]
- :pencil: updated to cypress 15

## [1.1.0]
- :pencil: updated to cypress 14

## [1.0.1]
- :pencil: updated dependencies

## [1.0.0]
- :rocket: added `this.executeStep` world method

## [0.2.0]
- :rocket: added _BeforeAll_ and _AfterAll_ hooks support

## [0.1.1]
- :beetle: changed browserify to webpack

## [0.1.0]
- :rocket: initial implementation
