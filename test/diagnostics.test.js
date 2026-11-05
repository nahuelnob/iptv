import { test } from 'node:test';
import assert from 'node:assert/strict';
import { androidVersionOf, describeFormat, describeDropped, nextSurface } from '../src/domain/diagnostics.js';

test('the Android version comes from the WebView user-agent; none outside Android', () => {
  assert.equal(androidVersionOf('Mozilla/5.0 (Linux; Android 11; Flow 4K Build/RP1A) AppleWebKit/537.36 Chrome/120.0 Mobile Safari/537.36'), '11');
  assert.equal(androidVersionOf('Mozilla/5.0 (Linux; Android 9; B866V2 Build/PPR1) AppleWebKit/537.36'), '9');
  assert.equal(androidVersionOf('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'), null);
});

test('the stream format reads as codec, resolution and frame rate', () => {
  assert.equal(describeFormat({ codecs: 'avc1.640028', mime: 'video/avc', width: 1920, height: 1080, frameRate: 29.97 }), 'avc1.640028 · 1920×1080 · 29.97 fps');
  assert.equal(describeFormat({ mime: 'video/mpeg2', width: 720, height: 576, frameRate: -1 }), 'video/mpeg2 · 720×576');
  assert.equal(describeFormat({ codecs: 'hvc1', width: -1, height: -1 }), 'hvc1');
  assert.equal(describeFormat(null), '—');
});

test('dropped frames add up across reports', () => {
  assert.equal(describeDropped(0), 'ninguno');
  assert.equal(describeDropped(1), '1 cuadro');
  assert.equal(describeDropped(37), '37 cuadros');
});

test('the surface switch alternates between TextureView and SurfaceView', () => {
  assert.equal(nextSurface('texture'), 'surface');
  assert.equal(nextSurface('surface'), 'texture');
  assert.equal(nextSurface(undefined), 'surface', 'TextureView is the default, so the switch goes to SurfaceView');
});
