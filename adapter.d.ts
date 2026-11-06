/// <reference types="cypress" />

export interface CucumberPreprocessorOptions {
    /** translation mode; defaults to MODE env variable or 'describe' */
    mode?: 'describe' | 'it';
    /** tag expression to filter scenarios; defaults to TAGS env variable */
    tags?: string;
    /** root that feature uris are relative to; defaults to current working directory */
    projectRoot?: string;
}

export interface SetupCucumberOptions {
    /** translation mode; defaults to MODE env variable or 'describe' */
    mode?: 'describe' | 'it';
    /** tag expression; defaults to TAGS Cypress env, then TAGS env variable */
    tags?: string;
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
