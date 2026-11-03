import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rewritePlaylist, isAllowedTarget, proxyPath } from '../scripts/proxy.mjs';

const lines = (...l) => l.join('\n');

test('builds the proxy path with the target URL encoded', () => {
  assert.equal(
    proxyPath('https://example.com/live/index.m3u8?token=a&b=c'),
    '/proxy?url=https%3A%2F%2Fexample.com%2Flive%2Findex.m3u8%3Ftoken%3Da%26b%3Dc',
  );
});

test('rewrites relative and absolute segment URIs to go through the proxy', () => {
  const playlist = lines(
    '#EXTM3U',
    '#EXT-X-TARGETDURATION:6',
    '#EXTINF:6.0,',
    'segment-001.ts',
    '#EXTINF:6.0,',
    '../other/segment-002.ts?sig=x',
    '#EXTINF:6.0,',
    'https://cdn.example.org/segment-003.ts',
  );

  assert.equal(rewritePlaylist(playlist, 'https://example.com/live/hd/index.m3u8'), lines(
    '#EXTM3U',
    '#EXT-X-TARGETDURATION:6',
    '#EXTINF:6.0,',
    proxyPath('https://example.com/live/hd/segment-001.ts'),
    '#EXTINF:6.0,',
    proxyPath('https://example.com/live/other/segment-002.ts?sig=x'),
    '#EXTINF:6.0,',
    proxyPath('https://cdn.example.org/segment-003.ts'),
  ));
});

test('rewrites URI attributes in tags such as keys, media and init maps', () => {
  const playlist = lines(
    '#EXTM3U',
    '#EXT-X-KEY:METHOD=AES-128,URI="key.bin",IV=0x1',
    '#EXT-X-MAP:URI="init.mp4"',
    '#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="aud",NAME="es",URI="audio/es.m3u8"',
  );

  assert.equal(rewritePlaylist(playlist, 'https://example.com/live/index.m3u8'), lines(
    '#EXTM3U',
    `#EXT-X-KEY:METHOD=AES-128,URI="${proxyPath('https://example.com/live/key.bin')}",IV=0x1`,
    `#EXT-X-MAP:URI="${proxyPath('https://example.com/live/init.mp4')}"`,
    `#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="aud",NAME="es",URI="${proxyPath('https://example.com/live/audio/es.m3u8')}"`,
  ));
});

test('keeps CRLF line endings', () => {
  assert.equal(
    rewritePlaylist('#EXTM3U\r\nchunk.ts\r\n', 'http://example.com/a/index.m3u8'),
    `#EXTM3U\r\n${proxyPath('http://example.com/a/chunk.ts')}\r\n`,
  );
});

test('allows public http and https targets only', () => {
  assert.equal(isAllowedTarget('https://example.com/live.m3u8'), true);
  assert.equal(isAllowedTarget('http://138.59.227.20:8000/index.m3u8'), true);

  for (const blocked of [
    'file:///etc/passwd',
    'ftp://example.com/x',
    'http://localhost:5173/',
    'http://app.localhost/',
    'http://127.0.0.1:8080/',
    'http://10.0.0.5/',
    'http://172.16.0.1/',
    'http://192.168.1.1/',
    'http://169.254.169.254/latest/meta-data',
    'http://0.0.0.0/',
    'http://[::1]/',
    'not a url',
  ]) {
    assert.equal(isAllowedTarget(blocked), false, blocked);
  }
});
