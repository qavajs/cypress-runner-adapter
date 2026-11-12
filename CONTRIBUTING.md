# Contributing

## Setup

```bash
npm install
```

## Running checks

`npm test` (alias `npm run verify`) runs the full suite used in CI: lint, format check, typecheck, unit tests, and
the Cypress e2e suites (`describe`/`it` modes, JS/TS, Cucumber messages). Run it before opening a PR.

Individual scripts (see `package.json`):

| Script | Purpose |
|---|---|
| `npm run lint` | oxlint |
| `npm run format` / `format:check` | prettier |
| `npm run typecheck` | TypeScript types (`.d.ts` files and `test/cypress-ts`) |
| `npm run test:unit` | unit tests (`test/unit`) |
| `npm run test:unit:coverage` | unit tests with Node's built-in coverage report |
| `npm run test:e2e` | e2e suite, `describe` mode, JS |
| `npm run test:it` | e2e suite, `it` mode, JS |
| `npm run test:ts` / `test:ts:it` | e2e suite, TypeScript support file |
| `npm run test:messages` | validates the generated Cucumber messages report |

Use the matching `npm run debug*` script (e.g. `npm run debug:it`) to open a scenario in the Cypress runner while
working on a fix.

## Pull requests

- Add or update unit/e2e tests for behavior changes.
- Update `CHANGELOG.md`.
- Keep `npm test` green.
