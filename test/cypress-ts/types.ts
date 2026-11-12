// compile-time checks of public typings, run by `npm run typecheck`; not imported by specs
import { DataTable, defineParameterType, Template, When, World } from '../../supportCodeLibrary/index';

class TypedWorld extends World {
    palette: Record<string, string> = {};
}

defineParameterType<{ hex: string }, TypedWorld>({
    name: 'typedColor',
    regexp: [/red/, 'blue'],
    transformer(color) {
        return { hex: this.palette[color] };
    }
});

defineParameterType<number>({
    name: 'typedNumber',
    regexp: /\d+/,
    // @ts-expect-error transformer must return declared type
    transformer: value => value
});

When('typed table', function (table: DataTable) {
    const [row] = table.hashes<'name' | 'value'>();
    const name: string = row.name;
    // @ts-expect-error column is not in header
    row.other;
    const hash = table.rowsHash<'login'>();
    const login: string = hash.login;
    return [name, login];
});

const searchTemplate = Template<[string, number]>(
    (term, count) => `
    I search '${term}'
    I expect ${count} results
`
);
When('I search {string} expecting {int}', searchTemplate);
// @ts-expect-error template arguments are typed
Template<[string]>((term: number) => `${term}`);
