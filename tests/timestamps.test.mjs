import test from 'node:test';
import assert from 'node:assert/strict';
import { parseServerTimestamp } from '../src/lib/timestamps.js';
test('server datetimes are UTC regardless of browser timezone', () => {
  const expected = Date.parse('2026-10-09T09:58:15.232Z');
  assert.equal(parseServerTimestamp('2026-10-09T09:58:15.232000').getTime(), expected);
  assert.equal(parseServerTimestamp('2026-10-09T09:58:15.232Z').getTime(), expected);
  assert.equal(parseServerTimestamp('2026-10-09T02:58:15.232-07:00').getTime(), expected);
  assert.equal(parseServerTimestamp('2026-10-09T09:58:15').toISOString(), '2026-10-09T09:58:15.000Z');
  assert.equal(parseServerTimestamp('2026-10-09T09:58:15.2').toISOString(), '2026-10-09T09:58:15.200Z');
});
test('invalid timestamps are safely unavailable', () => {
  for (const value of [null, undefined, '', 'bad', '2026-10-09']) assert.ok(Number.isNaN(parseServerTimestamp(value).getTime()));
});
