import { test } from 'node:test';
import assert from 'node:assert/strict';
import { strategyFor, cacheNames, staleCaches, IMAGE_CACHE_LIMIT } from '../src/sw/routes.js';
import { canRegisterServiceWorker } from '../src/infra/service-worker.js';

const scope = 'https://nahuelnob.github.io/iptv/';
const route = (url, extra = {}) => strategyFor({ url, scope, ...extra });

test('sends every non-GET request to the network', () => {
  assert.equal(route(`${scope}playlists/mi-lista.m3u`, { method: 'POST' }), 'network');
  assert.equal(route('https://upload.wikimedia.org/a/logo.png', { method: 'HEAD', destination: 'image' }), 'network');
});

test('serves the app shell, styles, scripts, assets and the list stale-while-revalidate', () => {
  for (const path of ['', 'index.html', 'src/main.js', 'styles/app.css', 'assets/favicon.svg', 'playlists/mi-lista.m3u']) {
    assert.equal(route(`${scope}${path}`), 'swr', path || 'the scope itself, as a file');
  }
  assert.equal(route(`${scope}assets/favicon.svg`, { destination: 'image' }), 'swr');
});

test('opens the page from the network first, so the Android app always gets a fresh Capacitor bridge', () => {
  assert.equal(route(scope, { mode: 'navigate', destination: 'document' }), 'page');
  assert.equal(route(`${scope}index.html`, { mode: 'navigate' }), 'page');
  assert.equal(route(`${scope}?canal=1`, { destination: 'document' }), 'page');
});

test('leaves same-origin files outside the scope to the network', () => {
  assert.equal(route('https://nahuelnob.github.io/otro/index.html'), 'network');
});

test('caches Google Fonts and the pinned hls.js cache-first', () => {
  assert.equal(route('https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:wght@400&display=swap', { destination: 'style' }), 'cache-first');
  assert.equal(route('https://fonts.gstatic.com/s/schibstedgrotesk/v3/a.woff2', { destination: 'font' }), 'cache-first');
  assert.equal(route('https://cdn.jsdelivr.net/npm/hls.js@1.7.3/dist/hls.min.js', { destination: 'script' }), 'cache-first');
  assert.equal(route('https://cdn.jsdelivr.net/npm/hls.js/dist/hls.min.js', { destination: 'script' }), 'network');
});

test('caches images from any https host in the capped image cache', () => {
  assert.equal(route('https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Logo.svg/120px-Logo.svg.png', { destination: 'image' }), 'image');
  assert.equal(route('https://i.imgur.com/abcd123s.png', { destination: 'image' }), 'image');
  assert.equal(route('https://example.com/logo?id=4', { destination: 'image' }), 'image');
  assert.equal(route('https://i.imgur.com/abcd123.jpg'), 'image');
  assert.equal(IMAGE_CACHE_LIMIT, 300);
});

test('leaves http images to the network (a worker fetch of http is blocked as mixed content)', () => {
  assert.equal(route('http://example.com/logo.png', { destination: 'image' }), 'network');
});

test('never caches streams, channel playlists or media requests', () => {
  for (const url of [
    'https://cdn.example.com/live/index.m3u8',
    'http://cdn.example.com/live/index.m3u8?token=a',
    'https://cdn.example.com/live/seg-001.ts',
    'https://cdn.example.com/live/chunk.m4s',
    'https://cdn.example.com/live/audio.aac',
    `${scope}playlists/canal.m3u8`,
  ]) {
    assert.equal(route(url), 'network', url);
  }
  assert.equal(route('https://cdn.example.com/live/stream', { destination: 'video' }), 'network');
  assert.equal(route('https://cdn.example.com/live/stream', { destination: 'audio' }), 'network');
});

test('never caches requests through the stream proxies', () => {
  const target = encodeURIComponent('https://cdn.example.com/live/index.m3u8');
  assert.equal(route(`https://proxy.nahue-santini.workers.dev/?url=${target}`), 'network');
  assert.equal(route(`https://proxy.nahue-santini.workers.dev/?url=${encodeURIComponent('https://x.com/logo.png')}`, { destination: 'image' }), 'network');
  assert.equal(route(`https://nahuelnob.github.io/proxy?url=${target}`), 'network');
  assert.equal(route(`${scope}proxy?url=${target}`), 'network');
});

test('never caches the update check or the APK downloads', () => {
  for (const url of [
    'https://api.github.com/repos/nahuelnob/iptv/releases/latest',
    'https://github.com/nahuelnob/iptv/releases/download/v0.2.3/nodo.apk',
    'https://objects.githubusercontent.com/github-production-release-asset/1/2',
    'https://release-assets.githubusercontent.com/github-production-release-asset/1/2',
  ]) {
    assert.equal(route(url), 'network', url);
  }
});

test('leaves anything else to the network', () => {
  assert.equal(route('https://example.com/data.json'), 'network');
  assert.equal(route('https://cdn.jsdelivr.net/npm/other@1.0.0/x.js', { destination: 'script' }), 'network');
});

test('names the app and static caches after the build stamp and keeps the logo cache across builds', () => {
  const a = cacheNames('abc123');
  const b = cacheNames('def456');
  assert.notEqual(a.app, b.app);
  assert.notEqual(a.static, b.static);
  assert.equal(a.images, b.images);
  assert.ok(a.app.includes('abc123') && a.static.includes('abc123'));
});

test('deletes only this app\'s caches of other builds on activate', () => {
  const old = cacheNames('old');
  const current = cacheNames('new');
  const existing = [old.app, old.static, old.images, current.app, 'someone-else'];
  assert.deepEqual(staleCaches(existing, 'new'), [old.app, old.static]);
});

test('registers the worker only over https and off localhost', () => {
  const nav = { serviceWorker: {} };
  const at = (href) => new URL(href);
  assert.equal(canRegisterServiceWorker(nav, at('https://nahuelnob.github.io/iptv/')), true);
  assert.equal(canRegisterServiceWorker(nav, at('http://nahuelnob.github.io/iptv/')), false);
  assert.equal(canRegisterServiceWorker(nav, at('https://localhost:5173/')), false);
  assert.equal(canRegisterServiceWorker(nav, at('http://127.0.0.1:5173/')), false);
  assert.equal(canRegisterServiceWorker(nav, at('https://[::1]:5173/')), false);
  assert.equal(canRegisterServiceWorker({}, at('https://nahuelnob.github.io/iptv/')), false);
});
