import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchName, searchChannels } from '../src/domain/search.js';

const channels = ['Televisión Pública', 'TN Todo Noticias', 'Canal 26', 'Telefe', 'Crónica TV']
  .map((name, i) => ({ id: `ch-${i}`, name, url: `https://a.example/${i}.m3u8` }));

test('matches channel names ignoring accents and case, and locates the match in the original name', () => {
  assert.deepEqual(matchName('Televisión Pública', 'television publica'), { start: 0, end: 18 });
  assert.deepEqual(matchName('Crónica TV', 'CRONICA'), { start: 0, end: 7 });
  // The range points into the original text even after an accented letter.
  assert.deepEqual(matchName('Televisión Pública', 'publica'), { start: 11, end: 18 });
  assert.deepEqual(matchName('Canal 26', '  canal   26 '), { start: 0, end: 8 }, 'extra spaces in the query are ignored');
  assert.equal(matchName('Telefe', 'pública'), null);
  assert.equal(matchName('Telefe', '   '), null, 'a blank query matches nothing');
});

test('search returns the matching channels in list order with their match ranges', () => {
  const hits = searchChannels(channels, 'ti');

  assert.deepEqual(hits.map(({ channel, match }) => [channel.name, match]), [
    ['TN Todo Noticias', { start: 10, end: 12 }],
  ]);
  assert.deepEqual(searchChannels(channels, 'TE').map(({ channel }) => channel.name), ['Televisión Pública', 'Telefe']);
  assert.deepEqual(searchChannels(channels, ''), []);
  assert.deepEqual(searchChannels(channels, 'zzz'), []);
});
