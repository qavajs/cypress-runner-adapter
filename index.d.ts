declare type Expression = string | RegExp;
declare type TestHookOptions = {
    tags?: string,
    name?: string
};
declare type StepHookOptions = {
    tags?: string
};
declare type ParameterTypeOption = {
    name: string,
    preferForRegexpMatch?: boolean,
    regexp: RegExp,
    transformer?: Function,
    useForSnippets?: boolean
}
declare interface IWorld {}
export function Given(expression: Expression, fn: Function): void;
export function When(expression: Expression, fn: Function): void;
export function Then(expression: Expression, fn: Function): void;
export function Before(fn: Function): void;
export function Before(options: TestHookOptions, fn: Function): void;
export function After(fn: Function): void;
export function After(options: TestHookOptions, fn: Function): void;
export function BeforeStep(fn: Function): void;
export function BeforeStep(options: StepHookOptions, fn: Function): void;
export function AfterStep(fn: Function): void;
export function AfterStep(options: StepHookOptions, fn: Function): void;
export function BeforeAll(fn: Function): void;
export function AfterAll(fn: Function): void;
export function setWorldConstructor(world: IWorld): void;
export function defineParameterType(option: ParameterTypeOption): void;
export function Template(template: (...args: any[]) => string): () => void;