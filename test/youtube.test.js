import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseYouTubeUrl, youtubeEmbedUrl } from '../src/domain/youtube.js';

const KNOWN = { 'c/todonoticias': 'UCj6PcyLvpnIRT_2W_mwa9Aw' };

test('recognizes video, channel and named-channel YouTube links', () => {
  assert.deepEqual(parseYouTubeUrl('https://www.youtube.com/watch?v=cb12KmMMDJA'), { kind: 'video', id: 'cb12KmMMDJA' });
  assert.deepEqual(parseYouTubeUrl('https://youtu.be/cb12KmMMDJA'), { kind: 'video', id: 'cb12KmMMDJA' });
  assert.deepEqual(parseYouTubeUrl('https://www.youtube.com/live/cb12KmMMDJA'), { kind: 'video', id: 'cb12KmMMDJA' });
  assert.deepEqual(
    parseYouTubeUrl('https://www.youtube.com/channel/UC6YundoLrEuBJaPp_oEPWaA/live'),
    { kind: 'channel', id: 'UC6YundoLrEuBJaPp_oEPWaA' },
  );
  assert.deepEqual(parseYouTubeUrl('https://www.youtube.com/c/todonoticias/live'), { kind: 'named', key: 'c/todonoticias' });
  assert.deepEqual(parseYouTubeUrl('https://www.youtube.com/user/CanalPakapaka/live'), { kind: 'named', key: 'user/canalpakapaka' });
  assert.deepEqual(parseYouTubeUrl('https://www.youtube.com/@c5n/live'), { kind: 'named', key: '@c5n' });
});

test('returns null for links that are not YouTube', () => {
  assert.equal(parseYouTubeUrl('https://example.com/watch?v=cb12KmMMDJA'), null);
  assert.equal(parseYouTubeUrl('https://5fb24b460df87.streamlock.net/live-cont.ar/deportv/playlist.m3u8'), null);
  assert.equal(parseYouTubeUrl('not a url'), null);
});

// Clean TV-style player: no control bar, no annotations, related videos from the same channel only.
const PLAYER_PARAMS = 'autoplay=1&controls=0&rel=0&iv_load_policy=3&playsinline=1';

test('builds the embed URL for a video, a channel live stream and a known named channel', () => {
  assert.equal(
    youtubeEmbedUrl('https://youtu.be/cb12KmMMDJA', KNOWN),
    `https://www.youtube.com/embed/cb12KmMMDJA?${PLAYER_PARAMS}`,
  );
  assert.equal(
    youtubeEmbedUrl('https://www.youtube.com/channel/UC6YundoLrEuBJaPp_oEPWaA/live', KNOWN),
    `https://www.youtube.com/embed/live_stream?channel=UC6YundoLrEuBJaPp_oEPWaA&${PLAYER_PARAMS}`,
  );
  assert.equal(
    youtubeEmbedUrl('https://www.youtube.com/c/TodoNoticias/live', KNOWN),
    `https://www.youtube.com/embed/live_stream?channel=UCj6PcyLvpnIRT_2W_mwa9Aw&${PLAYER_PARAMS}`,
  );
});

test('returns null for a named channel whose ID is unknown', () => {
  assert.equal(youtubeEmbedUrl('https://www.youtube.com/c/unknownchannel/live', KNOWN), null);
});
