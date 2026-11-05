import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startSession, markPlaying, nextReconnect, STABLE_MS } from '../src/domain/reconnect.js';

// Runs failures one after another, as the player does: each retry fails before playing again.
function failRepeatedly(session, now, times) {
  const steps = [];
  for (let i = 0; i < times; i++) {
    const next = nextReconnect(session, now);
    session = next.session;
    steps.push(next.delay);
  }
  return { session, steps };
}

test('a channel that was playing and drops reconnects after 1, 3, 6 and 10 seconds, then gives up', () => {
  const playing = markPlaying(startSession(), 0);
  const { steps } = failRepeatedly(playing, 5_000, 5);

  assert.deepEqual(steps, [1_000, 3_000, 6_000, 10_000, null]);
});

test('each reconnect says which try it is out of how many', () => {
  const playing = markPlaying(startSession(), 0);
  const first = nextReconnect(playing, 5_000);
  const second = nextReconnect(first.session, 6_000);

  assert.deepEqual([first.attempt, first.limit], [1, 4]);
  assert.deepEqual([second.attempt, second.limit], [2, 4]);
});

test('a channel that never started playing gets a single retry after 1 second, then gives up', () => {
  const { steps } = failRepeatedly(startSession(), 0, 2);

  assert.deepEqual(steps, [1_000, null]);
  assert.equal(nextReconnect(startSession(), 0).limit, 1);
});

test('after playing steadily for 30 seconds, a new drop starts the count over', () => {
  let session = markPlaying(startSession(), 0);
  session = failRepeatedly(session, 1_000, 4).session;

  session = markPlaying(session, 20_000);
  const next = nextReconnect(session, 20_000 + STABLE_MS);

  assert.equal(next.delay, 1_000);
  assert.equal(next.attempt, 1);
});

test('playing for less than 30 seconds between drops keeps counting toward the limit', () => {
  let session = markPlaying(startSession(), 0);
  session = failRepeatedly(session, 1_000, 3).session;

  session = markPlaying(session, 20_000);
  const fourth = nextReconnect(session, 20_000 + STABLE_MS - 1);
  const fifth = nextReconnect(fourth.session, 20_000 + STABLE_MS);

  assert.equal(fourth.delay, 10_000);
  assert.equal(fifth.delay, null);
});

test('resuming after a buffering pause keeps the time playback first resumed', () => {
  const session = markPlaying(markPlaying(startSession(), 0), 25_000);

  assert.equal(nextReconnect(session, STABLE_MS).attempt, 1, 'stable since 0, so the count starts over');
  assert.equal(session.playingSince, 0);
});
