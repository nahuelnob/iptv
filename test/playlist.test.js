import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseM3U, groupChannels } from '../src/domain/playlist.js';

const crlf = (...lines) => lines.join('\r\n');

test('parses name, logo, tvg-id and stream URL from an EXTINF entry', () => {
  const channels = parseM3U(crlf(
    '#EXTM3U',
    '#EXTINF:-1 tvg-id="5tv.ar@SD" tvg-logo="https://i.imgur.com/mSn7ACs.png" group-title="General",5tv',
    'https://example.com/tvcinco/playlist.m3u8',
  ));

  assert.deepEqual(channels, [{
    id: 'ch-0',
    name: '5tv',
    quality: null,
    unstable: false,
    geoBlocked: false,
    logo: 'https://i.imgur.com/mSn7ACs.png',
    tvgId: '5tv.ar@SD',
    groups: ['General'],
    url: 'https://example.com/tvcinco/playlist.m3u8',
  }]);
});

test('takes the name after the first comma outside quoted attributes', () => {
  const [channel] = parseM3U(crlf(
    '#EXTM3U',
    '#EXTINF:-1 tvg-name="Canal, Uno" group-title="News",Canal Uno, Edición Noche',
    'https://example.com/uno.m3u8',
  ));

  assert.equal(channel.name, 'Canal Uno, Edición Noche');
});

test('extracts the resolution tag and the "Not 24/7" flag from the name', () => {
  const [hd, partTime] = parseM3U(crlf(
    '#EXTM3U',
    '#EXTINF:-1 group-title="News",A24 (1080p)',
    'https://example.com/a24.m3u8',
    '#EXTINF:-1 group-title="General",AlternaTV (720p) [Not 24/7]',
    'https://example.com/alterna.m3u8',
  ));

  assert.equal(hd.name, 'A24');
  assert.equal(hd.quality, '1080p');
  assert.equal(hd.unstable, false);
  assert.equal(partTime.name, 'AlternaTV');
  assert.equal(partTime.quality, '720p');
  assert.equal(partTime.unstable, true);
});

test('strips Free-TV markers from the name and keeps their meaning as flags', () => {
  const [youtube, geo, sd] = parseM3U(crlf(
    '#EXTM3U',
    '#EXTINF:-1 tvg-name="TN Todo Noticias Ⓨ" group-title="Argentina",TN Todo Noticias Ⓨ',
    'https://www.youtube.com/c/todonoticias/live',
    '#EXTINF:-1 tvg-name="Encuentro Ⓨ" group-title="Argentina",Encuentro Ⓨ Ⓖ',
    'https://www.youtube.com/user/encuentro/live',
    '#EXTINF:-1 group-title="Argentina",Canal 26 Ⓢ',
    'https://example.com/canal26.m3u8',
  ));

  assert.equal(youtube.name, 'TN Todo Noticias');
  assert.equal(youtube.geoBlocked, false);
  assert.equal(geo.name, 'Encuentro');
  assert.equal(geo.geoBlocked, true);
  assert.equal(sd.name, 'Canal 26');
  assert.equal(sd.quality, 'sd');
});

test('splits multi-group titles and files missing or "Undefined" groups under "Otros"', () => {
  const channels = parseM3U(crlf(
    '#EXTM3U',
    '#EXTINF:-1 group-title="Animation;Kids",Pakapaka',
    'https://example.com/paka.m3u8',
    '#EXTINF:-1 group-title="Undefined",Bragado TV',
    'https://example.com/bragado.m3u8',
    '#EXTINF:-1,No Group TV',
    'https://example.com/nogroup.m3u8',
  ));

  assert.deepEqual(channels.map((c) => c.groups), [['Animación', 'Infantiles'], ['Otros'], ['Otros']]);
});

test('shows list categories in Spanish and keeps names it does not know', () => {
  const channels = parseM3U(crlf(
    '#EXTM3U',
    '#EXTINF:-1 group-title="Music",Beats Radio',
    'https://example.com/1.m3u8',
    '#EXTINF:-1 group-title="Sports;News",TyC',
    'https://example.com/2.m3u8',
    '#EXTINF:-1 group-title="movies",Cine.AR',
    'https://example.com/3.m3u8',
    '#EXTINF:-1 group-title="Argentina",Telefe',
    'https://example.com/4.m3u8',
    '#EXTINF:-1 group-title="Movies;Cine",Cine Clásico',
    'https://example.com/5.m3u8',
  ));

  assert.deepEqual(channels.map((c) => c.groups), [
    ['Música'],
    ['Deportes', 'Noticias'],
    ['Cine'],
    ['Argentina'],
    ['Cine'],
  ]);
});

test('skips player option lines and entries without a stream URL', () => {
  const channels = parseM3U(crlf(
    '#EXTM3U',
    '#EXTINF:-1 group-title="Music",No URL',
    '#EXTINF:-1 group-title="Music",Beats Radio (480p)',
    '#EXTVLCOPT:http-referrer=https://example.com/',
    '#EXTVLCOPT:http-user-agent=Mozilla/5.0',
    'https://example.com/beats.m3u8',
    '',
  ));

  assert.equal(channels.length, 1);
  assert.equal(channels[0].name, 'Beats Radio');
  assert.equal(channels[0].url, 'https://example.com/beats.m3u8');
});

test('returns no channels for text that is not an M3U playlist', () => {
  assert.deepEqual(parseM3U(''), []);
  assert.deepEqual(parseM3U('<html><body>Not found</body></html>'), []);
});

test('groups channels into rows by size, ties in playlist order, with "Otros" last', () => {
  const channels = parseM3U(crlf(
    '#EXTM3U',
    '#EXTINF:-1 group-title="Undefined",Bragado TV',
    'https://example.com/1.m3u8',
    '#EXTINF:-1 group-title="Undefined",BVC',
    'https://example.com/2.m3u8',
    '#EXTINF:-1 group-title="Undefined",Cadena103.TV',
    'https://example.com/3.m3u8',
    '#EXTINF:-1 group-title="News",A24',
    'https://example.com/4.m3u8',
    '#EXTINF:-1 group-title="Animation;Kids",Pakapaka',
    'https://example.com/5.m3u8',
    '#EXTINF:-1 group-title="Kids",Billiken',
    'https://example.com/6.m3u8',
  ));

  const rows = groupChannels(channels);

  assert.deepEqual(rows.map((r) => [r.name, r.channels.map((c) => c.name)]), [
    ['Infantiles', ['Pakapaka', 'Billiken']],
    ['Noticias', ['A24']],
    ['Animación', ['Pakapaka']],
    ['Otros', ['Bragado TV', 'BVC', 'Cadena103.TV']],
  ]);
});
