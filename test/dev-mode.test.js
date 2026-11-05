import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextTap, tapHint, TAPS_TO_TOGGLE, TAP_GAP_MS } from '../src/domain/dev-mode.js';

function tap(times, { every = 500, start = 0, streak = null } = {}) {
  const results = [];
  for (let i = 0; i < times; i++) {
    const result = nextTap(streak, start + i * every);
    streak = result.streak;
    results.push(result);
  }
  return results;
}

test('seven OKs in a row on Inicio toggle the developer options, on the seventh only', () => {
  const results = tap(TAPS_TO_TOGGLE);

  assert.equal(TAPS_TO_TOGGLE, 7);
  assert.deepEqual(results.map((r) => r.toggle), [false, false, false, false, false, false, true]);
});

test('a pause longer than 1.5 seconds starts the count over', () => {
  const first = tap(5);
  const late = nextTap(first.at(-1).streak, 4 * 500 + TAP_GAP_MS + 1);

  assert.equal(late.remaining, TAPS_TO_TOGGLE - 1);
  assert.equal(late.toggle, false);
});

test('after toggling, the next OK starts a new count', () => {
  const results = tap(TAPS_TO_TOGGLE + 1);

  assert.equal(results.at(-1).toggle, false);
  assert.equal(results.at(-1).remaining, TAPS_TO_TOGGLE - 1);
});

test('from the fourth OK the hint says how many are left, like Android build number', () => {
  const remaining = tap(6).map((r) => r.remaining);

  assert.deepEqual(remaining, [6, 5, 4, 3, 2, 1]);
  assert.equal(tapHint(4, true), null, 'no hint before the fourth OK');
  assert.equal(tapHint(3, true), 'Te faltan 3 toques para activar las opciones de desarrollador.');
  assert.equal(tapHint(1, true), 'Te falta 1 toque para activar las opciones de desarrollador.');
  assert.equal(tapHint(2, false), 'Te faltan 2 toques para desactivar las opciones de desarrollador.');
});
