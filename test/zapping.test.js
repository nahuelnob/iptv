import { test } from 'node:test';
import assert from 'node:assert/strict';
import { neighborChannel, neighborWindow } from '../src/domain/zapping.js';

const list = ['A', 'B', 'C', 'D', 'E', 'F'].map((name, i) => ({ id: `ch-${i}`, name, url: `https://a.example/${name}` }));
const names = (channels) => channels.map((c) => c.name);

test('▲ goes to the channel above and ▼ to the one below, wrapping around the list the viewer came from', () => {
  assert.equal(neighborChannel(list, list[2], -1), list[1]);
  assert.equal(neighborChannel(list, list[2], 1), list[3]);
  assert.equal(neighborChannel(list, list[0], -1), list[5], 'the list is circular going up');
  assert.equal(neighborChannel(list, list[5], 1), list[0], 'the list is circular going down');
  assert.equal(neighborChannel([list[3]], list[3], 1), list[3], 'a one-channel list stays on that channel');
  assert.equal(neighborChannel(list, { name: 'X', url: 'x' }, 1), list[0], 'a channel outside the list starts it over');
  assert.equal(neighborChannel([], list[0], 1), list[0], 'an empty list keeps the current channel');
});

test('the strip shows up to two channels on each side of the current one, never repeating a channel', () => {
  assert.deepEqual(names(neighborWindow(list, list[0])), ['E', 'F', 'A', 'B', 'C']);
  assert.deepEqual(names(neighborWindow(list, list[3])), ['B', 'C', 'D', 'E', 'F']);
  assert.deepEqual(names(neighborWindow(list.slice(0, 4), list[0])), ['D', 'A', 'B', 'C']);
  assert.deepEqual(names(neighborWindow(list.slice(0, 3), list[1])), ['A', 'B', 'C']);
  assert.deepEqual(names(neighborWindow([list[2]], list[2])), ['C']);
  assert.deepEqual(names(neighborWindow([], list[2])), ['C']);
});
