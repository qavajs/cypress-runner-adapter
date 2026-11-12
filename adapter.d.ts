/// <reference types="cypress" />

export interface CucumberPreprocessorOptions {
    /** translation mode; defaults to MODE env variable or 'describe' */
    mode?: 'describe' | 'it';
    /** tag expression to filter scenarios; defaults to TAGS env variable */
    tags?: string;
    /** regular expression to filter scenarios by name; defaults to SCENARIO_NAME env variable */
    name?: string | RegExp;
    /**
     * `path:line[:line...]` entries to filter scenarios (scenario or example row line), path without line selects
     * whole file; array or comma-separated string, defaults to SCENARIO_LINES env variable
     */
    lines?: string | string[];
    /** record cucumber messages; requires `setupCucumber` with `messages` option */
    messages?: boolean;
    /** root that feature uris are relative to; defaults to current working directory */
    projectRoot?: string;
}

export interface SetupCucumberOptions {
    /** translation mode; defaults to MODE env variable or 'describe' */
    mode?: 'describe' | 'it';
    /** tag expression; defaults to TAGS Cypress env, then TAGS env variable */
    tags?: string;
    /** regular expression to filter scenarios by name; defaults to SCENARIO_NAME Cypress env, then env variable */
    name?: string | RegExp;
    /**
     * `path:line[:line...]` entries to filter scenarios (scenario or example row line), path without line selects
     * whole file; array or comma-separated string, defaults to SCENARIO_LINES Cypress env, then env variable
     */
    lines?: string | string[];
    /** path of cucumber messages (.ndjson) report relative to project root */
    messages?: string;
    /**
     * in `cypress open`, list each scenario (and each Scenario Outline example row) as a separate spec;
     * a string sets the directory of generated specs relative to project root (default: cypress/scenarios);
     * defaults to SCENARIO_SPECS Cypress env, then SCENARIO_SPECS env variable
     */
    scenarioSpecs?: boolean | string;
}

export type FilePreprocessor = (file: Cypress.FileObject) => Promise<string>;

export function createCucumberPreprocessor(options?: CucumberPreprocessorOptions): FilePreprocessor;

export function setupCucumber(
    on: Cypress.PluginEvents,
    config: Cypress.PluginConfigOptions,
    options?: SetupCucumberOptions
): Cypress.PluginConfigOptions;

declare const cucumber: FilePreprocessor;
export default cucumber;
