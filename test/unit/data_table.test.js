import { test } from 'node:test';
import assert from 'node:assert/strict';
import DataTable from '../../supportCodeLibrary/data_table.js';

const gherkinTable = {
    rows: [
        { cells: [{ value: 'name' }, { value: 'value' }] },
        { cells: [{ value: 'first' }, { value: 'one' }] },
        { cells: [{ value: 'second' }, { value: 'two' }] }
    ]
};

test('raw returns copy of cells', () => {
    const table = new DataTable(gherkinTable);
    const raw = table.raw();
    raw.pop();
    assert.equal(table.raw().length, 3);
});

test('hashes', () => {
    assert.deepEqual(new DataTable(gherkinTable).hashes(), [
        { name: 'first', value: 'one' },
        { name: 'second', value: 'two' }
    ]);
});

test('rows skips header', () => {
    assert.deepEqual(new DataTable(gherkinTable).rows(), [
        ['first', 'one'],
        ['second', 'two']
    ]);
});

test('rowsHash', () => {
    assert.deepEqual(
        new DataTable([
            ['a', '1'],
            ['b', '2']
        ]).rowsHash(),
        { a: '1', b: '2' }
    );
    assert.throws(() => new DataTable([['a', '1', 'x']]).rowsHash(), /exactly two columns/);
});

test('transpose', () => {
    assert.deepEqual(
        new DataTable([
            ['a', 'b'],
            ['1', '2']
        ])
            .transpose()
            .raw(),
        [
            ['a', '1'],
            ['b', '2']
        ]
    );
});
