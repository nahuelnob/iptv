import { test } from 'node:test';
import assert from 'node:assert/strict';
import { logoUrl } from '../src/domain/logo-url.js';

const thumb = (px) => `https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/America_TV.png/${px}px-America_TV.png`;

test('a Wikimedia thumbnail is requested at the smaller standard size the screen needs', () => {
  assert.equal(logoUrl(thumb(960), 330), thumb(330));
  assert.equal(logoUrl(thumb(500), 120), thumb(120));
});

test('a logo is never requested larger than the list gave it', () => {
  assert.equal(logoUrl(thumb(250), 330), thumb(250));
});

test('logos the service cannot resize keep their address', () => {
  const original = 'https://upload.wikimedia.org/wikipedia/commons/c/c8/America_TV.png';
  assert.equal(logoUrl(original, 120), original, 'a Wikimedia original, not a thumbnail');
  assert.equal(logoUrl('https://i.imgur.com/LnXQkIU.png', 120), 'https://i.imgur.com/LnXQkIU.png', 'imgur thumbnails are JPEG: transparency would be lost');
  assert.equal(logoUrl('not a url', 120), 'not a url');
  assert.equal(logoUrl('', 120), '');
});
