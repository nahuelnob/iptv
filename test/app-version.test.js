import { test } from 'node:test';
import assert from 'node:assert/strict';
import { versionCodeOf, pickUpdate, APK_ASSET } from '../src/domain/app-version.js';

const release = (tag, assets = [{ name: APK_ASSET, browser_download_url: `https://example.com/${tag}/nodo.apk` }]) => ({
  tag_name: tag,
  assets,
});

test('turns a release tag into the Android version code: major * 10000 + minor * 100 + patch', () => {
  assert.equal(versionCodeOf('v0.2.0'), 200);
  assert.equal(versionCodeOf('1.4.12'), 10412);
  assert.equal(versionCodeOf('v10.0.1'), 100001);
});

test('rejects tags that are not major.minor.patch', () => {
  assert.equal(versionCodeOf('latest'), null);
  assert.equal(versionCodeOf('v1.2'), null);
  assert.equal(versionCodeOf('v1.2.3-beta'), null);
  assert.equal(versionCodeOf(undefined), null);
});

test('offers a release whose version code is above the installed build', () => {
  assert.deepEqual(pickUpdate(release('v0.2.0'), '1'), {
    version: '0.2.0',
    code: 200,
    url: 'https://example.com/v0.2.0/nodo.apk',
  });
});

test('offers nothing when the installed build is the same or newer', () => {
  assert.equal(pickUpdate(release('v0.2.0'), '200'), null);
  assert.equal(pickUpdate(release('v0.2.0'), 300), null);
});

test('offers nothing when the release has no nodo.apk asset or an unreadable tag', () => {
  assert.equal(pickUpdate(release('v0.3.0', [{ name: 'other.apk', browser_download_url: 'x' }]), '200'), null);
  assert.equal(pickUpdate(release('nightly'), '200'), null);
  assert.equal(pickUpdate(null, '200'), null);
});
