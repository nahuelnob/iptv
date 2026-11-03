import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  emptyLibrary, parseLibrary, toggleFavorite, isFavorite, markWatched, favoriteChannels, lastWatchedChannel,
} from '../src/domain/library.js';

const channel = (index, name, url) => ({ id: `ch-${index}`, name, url, groups: ['General'] });

test('toggling a favorite appends it in the order added, toggling again removes it, inputs stay untouched', () => {
  const start = emptyLibrary();
  const one = toggleFavorite(start, 'https://a.example/tn.m3u8');
  const two = toggleFavorite(one, 'https://a.example/c5n.m3u8');
  const removed = toggleFavorite(two, 'https://a.example/tn.m3u8');

  assert.deepEqual(two.favorites, ['https://a.example/tn.m3u8', 'https://a.example/c5n.m3u8']);
  assert.deepEqual(removed.favorites, ['https://a.example/c5n.m3u8']);
  assert.equal(isFavorite(two, 'https://a.example/tn.m3u8'), true);
  assert.equal(isFavorite(removed, 'https://a.example/tn.m3u8'), false);
  assert.deepEqual(start, { favorites: [], lastWatched: null });
  assert.deepEqual(one.favorites, ['https://a.example/tn.m3u8']);
});

test('marking a channel as watched replaces the last watched entry and keeps favorites', () => {
  const library = toggleFavorite(emptyLibrary(), 'https://a.example/tn.m3u8');
  const first = markWatched(library, 'https://a.example/c26.m3u8', 1000);
  const second = markWatched(first, 'https://a.example/tn.m3u8', 2000);

  assert.deepEqual(first.lastWatched, { url: 'https://a.example/c26.m3u8', at: 1000 });
  assert.deepEqual(second.lastWatched, { url: 'https://a.example/tn.m3u8', at: 2000 });
  assert.deepEqual(second.favorites, ['https://a.example/tn.m3u8']);
  assert.equal(library.lastWatched, null);
});

test('saved URLs match the loaded channels by stream URL, in saved order, skipping ones not in the list', () => {
  // Positions (and so ids) differ from when the favorites were saved: matching must use the URL.
  const channels = [
    channel(0, 'Canal 26', 'https://a.example/c26.m3u8'),
    channel(1, 'TN', 'https://a.example/tn.m3u8'),
    channel(2, 'C5N', 'https://a.example/c5n.m3u8'),
  ];
  let library = emptyLibrary();
  for (const url of ['https://a.example/c5n.m3u8', 'https://gone.example/x.m3u8', 'https://a.example/c26.m3u8']) {
    library = toggleFavorite(library, url);
  }
  library = markWatched(library, 'https://a.example/tn.m3u8', 1);

  assert.deepEqual(favoriteChannels(library, channels).map((c) => c.name), ['C5N', 'Canal 26']);
  assert.equal(lastWatchedChannel(library, channels), channels[1]);
  assert.equal(lastWatchedChannel(markWatched(library, 'https://gone.example/x.m3u8', 2), channels), null);
  assert.equal(lastWatchedChannel(emptyLibrary(), channels), null);
});

test('stored data is read defensively: anything malformed becomes an empty library', () => {
  const saved = markWatched(toggleFavorite(emptyLibrary(), 'https://a.example/tn.m3u8'), 'https://a.example/tn.m3u8', 5);

  assert.deepEqual(parseLibrary(JSON.stringify(saved)), saved);
  assert.deepEqual(parseLibrary(null), emptyLibrary());
  assert.deepEqual(parseLibrary('{not json'), emptyLibrary());
  assert.deepEqual(parseLibrary('[1,2]'), emptyLibrary());
  assert.deepEqual(
    parseLibrary(JSON.stringify({ favorites: ['https://a.example/x', 7, null], lastWatched: { url: 3 } })),
    { favorites: ['https://a.example/x'], lastWatched: null },
  );
});
