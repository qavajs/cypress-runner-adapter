import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withLocation } from '../../runtime/location.js';

test('appends location to error message', () => {
    const error = withLocation(new Error('boom'), 'login.feature:12');
    assert.equal(error.message, 'boom\n\n    at login.feature:12');
    assert.equal(error.qavajsLocation, 'login.feature:12');
});

test('does not append location twice', () => {
    const error = withLocation(new Error('boom'), 'login.feature:12');
    withLocation(error, 'other.feature:1');
    assert.equal(error.message, 'boom\n\n    at login.feature:12');
});

test('wraps a thrown string instead of crashing', () => {
    const error = withLocation('plain string failure', 'login.feature:12');
    assert.ok(error instanceof Error);
    assert.equal(error.message, 'plain string failure\n\n    at login.feature:12');
});

test('wraps a thrown non-error value instead of crashing', () => {
    const error = withLocation(42, 'login.feature:12');
    assert.ok(error instanceof Error);
    assert.equal(error.message, '42\n\n    at login.feature:12');
});

test('passes through null/undefined untouched', () => {
    assert.equal(withLocation(null, 'login.feature:12'), null);
    assert.equal(withLocation(undefined, 'login.feature:12'), undefined);
});
