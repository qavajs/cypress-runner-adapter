export type Expression = string | RegExp;

export class DataTable {
    constructor(sourceTable: string[][] | { rows: { cells: { value: string }[] }[] });
    raw(): string[][];
    rows(): string[][];
    hashes(): Record<string, string>[];
    rowsHash(): Record<string, string>;
    transpose(): DataTable;
}

export interface GherkinDocument {
    uri?: string;
    feature?: {
        name: string;
        description: string;
        tags: { name: string }[];
        children: object[];
    };
    comments: object[];
}

export interface Pickle {
    id: string;
    uri: string;
    name: string;
    language: string;
    steps: { id: string; text: string; argument?: object }[];
    tags: { name: string; astNodeId: string }[];
    astNodeIds: string[];
}

export interface TestStepResult {
    status: string;
    duration?: { seconds: number; nanos: number };
    message?: string;
}

export interface TestCaseHookParams {
    gherkinDocument: GherkinDocument;
    pickle: Pickle;
    testCaseStartedId: string;
    willBeRetried: boolean;
    result?: TestStepResult;
    error?: Error;
}

export interface TestStepHookParams {
    gherkinDocument: GherkinDocument;
    pickle: Pickle;
    testCaseStartedId: string;
    result?: TestStepResult;
    error?: Error;
}

export interface WorldOptions {
    log: (...args: any[]) => void;
    attach: (data: string, mediaType?: string) => void;
    link: (url: string, text?: string) => void;
}

export class World {
    log(...args: any[]): void;
    attach(data: string, mediaType?: string): void;
    link(url: string, text?: string): void;
    executeStep(text: string, argument?: DataTable | string): void;
    constructor(options: WorldOptions);
}

type StepFn<W extends World = World> = (this: W, ...args: any[]) => any;

export function defineStep<W extends World = World>(keyword: string, expression: Expression, fn: StepFn<W>): void;
export function Given<W extends World = World>(expression: Expression, fn: StepFn<W>): void;
export function When<W extends World = World>(expression: Expression, fn: StepFn<W>): void;
export function Then<W extends World = World>(expression: Expression, fn: StepFn<W>): void;

type TestCaseHookFn = (this: World, params: TestCaseHookParams) => any;
type TestStepHookFn = (this: World, params: TestStepHookParams) => any;
type TestRunHookFn = (this: World) => any;

export interface TestCaseHookOptions {
    tags?: string;
    name?: string;
}

export interface TestStepHookOptions {
    tags?: string;
}

export function Before(fn: TestCaseHookFn): void;
export function Before(options: TestCaseHookOptions, fn: TestCaseHookFn): void;
export function After(fn: TestCaseHookFn): void;
export function After(options: TestCaseHookOptions, fn: TestCaseHookFn): void;
export function BeforeStep(fn: TestStepHookFn): void;
export function BeforeStep(options: TestStepHookOptions, fn: TestStepHookFn): void;
export function AfterStep(fn: TestStepHookFn): void;
export function AfterStep(options: TestStepHookOptions, fn: TestStepHookFn): void;
export function BeforeAll(fn: TestRunHookFn): void;
export function AfterAll(fn: TestRunHookFn): void;

export interface ParameterTypeOption {
    name: string;
    regexp: RegExp;
    transformer?: (...args: string[]) => any;
    useForSnippets?: boolean;
    preferForRegexpMatch?: boolean;
}

export function defineParameterType(option: ParameterTypeOption): void;
export function setWorldConstructor(world: new (...args: any[]) => World): void;
export function setDefaultTimeout(milliseconds: number): void;
export function Template(template: (...args: any[]) => string): (...args: any[]) => void;
