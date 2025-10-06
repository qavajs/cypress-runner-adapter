# Change Log

All notable changes to the "@qavajs/cypress-runner-adapter" will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

:rocket: - new feature

:beetle: - bugfix

:x: - deprecation/removal

:pencil: - chore

:microscope: - experimental

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
