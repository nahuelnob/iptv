import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('the APK loads the site GitHub Pages publishes and falls back to the bundled offline page', () => {
  const config = JSON.parse(read('capacitor.config.json'));

  assert.equal(config.server.url, 'https://nahuelnob.github.io/iptv/');
  assert.equal(config.server.errorPath, 'offline.html');
  assert.match(read('scripts/build-www.mjs'), /'offline\.html'/);
});

test("the offline page retries the app's own URL, the only origin the WebView may navigate to", () => {
  const { server } = JSON.parse(read('capacitor.config.json'));
  const retryUrl = read('offline.html').match(/const APP_URL = '([^']+)'/)?.[1];

  assert.equal(retryUrl, server.url);
});
