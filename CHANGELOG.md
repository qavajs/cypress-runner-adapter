# Change Log

All notable changes to the "@qavajs/cypress-runner-adapter" will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

:rocket: - new feature

:beetle: - bugfix

:x: - deprecation/removal

:pencil: - chore

:microscope: - experimental

## [2.2.0]
- :rocket: added `name` and `lines` filters (`SCENARIO_NAME`, `SCENARIO_LINES` env) to run scenarios by name regexp or `path:line`
- :rocket: `@skip(reason)` skips scenario and shows the reason in the test title
- :rocket: typed `DataTable.hashes`/`rowsHash` keys, `defineParameterType` transformer result and World, and `Template` arguments

## [2.1.0]
- :rocket: added `scenarioSpecs` option to `setupCucumber`: lists each scenario and Scenario Outline example row as a separate spec in `cypress open`
- :rocket: `scenarioSpecs` can be set via `SCENARIO_SPECS` Cypress env or environment variable
- :rocket: added `createCucumberPreprocessor({ mode, tags })` to configure the preprocessor without environment variables
- :rocket: undefined steps now fail with a ready-to-use step definition snippet; ambiguous steps list matching patterns
- :rocket: feature files are watched in `cypress open` and rerun on change
- :rocket: `After` and `AfterStep` hooks receive `error`; step hooks receive `pickleStep` and `testStepId`
- :rocket: added `setupCucumber(on, config, options)`: excludes feature files without scenarios matching tags and writes Cucumber messages report (`messages` option)
- :rocket: added step options: `When(pattern, { timeout }, fn)`
- :rocket: added `@only`, `@skip` and Cypress configuration tags (e.g. `@retries(2)`)
- :rocket: errors include feature file location; Gherkin parse errors include file path
- :rocket: step definitions accept argument types via generics
- :rocket: `pickle.uri` and `gherkinDocument.uri` are relative to project root
- :beetle: fixed `BeforeStep`/`AfterStep` with `tags` option throwing `TypeError`
- :beetle: hooks now receive actual `gherkinDocument` instead of list of pickles
- :beetle: `it` mode: fixed hooks receiving wrong pickle for scenarios with duplicate names
- :beetle: `it` mode: `AfterStep` on failure reports the failed step instead of the last one; `Before` hook failure no longer skips the rest of the feature
- :beetle: `describe` mode: `AfterStep` receives step result instead of accumulated scenario result; step hooks are not run for skipped steps; failed attempt no longer skips the retry
- :beetle: `describe` mode: undefined step after a failure is reported as skipped
- :beetle: `World` instance no longer has `executeStep` patched onto user's class prototype
- :pencil: browser runtime is bundled with esbuild and shared between modes; `.js` support files are transpiled with esbuild instead of babel
- :pencil: added ESLint, Prettier and Dependabot
- :pencil: added `peerDependencies` on cypress and `engines` (Node.js >= 22); added unit tests and type checking to CI; publish runs tests first and uses npm provenance
- :pencil: replaced ESLint with oxlint

## [2.0.0]
- :rocket: migrated package to ESM (`"type": "module"`); all `require`/`module.exports` usages converted to `import`/`export`
- :pencil: updated @cucumber/cucumber-expressions, @cucumber/gherkin, @cucumber/tag-expressions, @cypress/webpack-preprocessor, ts-loader, cypress

## [1.11.0]
- :rocket: added built-in TypeScript support — `.ts` support files are compiled automatically via `ts-loader` with no extra configuration required

## [1.10.0]
- :rocket: added `defineStep` to type declarations
- :rocket: added `setDefaultTimeout` export to set `defaultCommandTimeout` via Cucumber-compatible API
- :rocket: `willBeRetried` in `After` hook now reflects actual Cypress retry state (`it` mode) or last failed step retry state (`describe` mode)
- :rocket: `attach(data, mimeType)` now accepts an optional MIME type; image attachments are rendered as data URIs, other types show the MIME type as the log display name

## [1.9.2]
- :beetle: fixed `TestCaseHookDefinition.name` defaulting to `undefined` when no name option is provided
- :pencil: removed dead `getInvocationParameters` methods from hook definitions (referenced non-existent base methods and were never called)
- :pencil: removed unused `lookupSource` from `SourcedParameterTypeRegistry`
- :pencil: removed redundant `index.js`/`adapter.js` one-liner wrappers; added `exports` map in `package.json`
- :pencil: fixed `World` type declaration: `executeStep` is an instance method, not a constructor option; removed unused `IWorld` type

## [1.9.1]
- :beetle: fixed step context binding in `it` mode to correctly persist current step for hook execution
- :pencil: replaced `fs-extra` usage in adapter preprocessor with Node.js built-in `fs`/`path`
- :pencil: restricted published package contents with `files` list in `package.json`
- :pencil: improved typings for adapter return type and `World.executeStep`

## [1.9.0]
- :rocket: added step log groups for `it` mode

## [1.8.0]
- :rocket: added `testCaseStartedId` and `testStepId` as hooks parameters to comply cucumber spec

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
import { When, Template } from '@qavajs/cypress-runner-adapter';

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
