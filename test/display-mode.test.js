import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickDisplayMode, describeRates } from '../src/domain/display-mode.js';

const mode = (id, refreshRate, width = 1920, height = 1080) => ({ id, width, height, refreshRate });
const modes = [mode(1, 60), mode(2, 50), mode(3, 59.94), mode(4, 24), mode(5, 50, 3840, 2160)];

test('a 25 or 50 fps channel on a 60 Hz screen asks for the 50 Hz mode of the same resolution', () => {
  assert.equal(pickDisplayMode(25, modes, 1), 2);
  assert.equal(pickDisplayMode(50, modes, 1), 2);
});

test('a 29.97 fps channel picks 59.94 Hz over 60 Hz', () => {
  assert.equal(pickDisplayMode(29.97, modes, 1), 3);
  assert.equal(pickDisplayMode(59.94, modes, 2), 3);
});

test('a screen already in step with the video is left alone', () => {
  assert.equal(pickDisplayMode(60, modes, 1), null);
  assert.equal(pickDisplayMode(30, modes, 1), null, '60 Hz shows each 30 fps frame twice');
  assert.equal(pickDisplayMode(25, modes, 2), null);
});

test('no change without a matching mode at the current resolution, or without a measured rate', () => {
  assert.equal(pickDisplayMode(25, [mode(1, 60), mode(5, 50, 3840, 2160)], 1), null, 'only another resolution has 50 Hz');
  assert.equal(pickDisplayMode(0, modes, 1), null);
  assert.equal(pickDisplayMode(null, modes, 1), null);
  assert.equal(pickDisplayMode(25, [], 1), null);
  assert.equal(pickDisplayMode(25, modes, 99), null, 'unknown current mode');
});

test('the panel reads the video rate against the screen refresh', () => {
  assert.equal(describeRates(25, 60), '25 fps · pantalla 60 Hz');
  assert.equal(describeRates(29.97, 59.94), '29.97 fps · pantalla 59.94 Hz');
  assert.equal(describeRates(null, 60), 'midiendo · pantalla 60 Hz');
  assert.equal(describeRates(null, null), '—');
});

test('a measured rate snaps to the closest broadcast rate, not to a neighbor 0.1% away', () => {
  assert.equal(pickDisplayMode(60.02, modes, 1), null, 'measured 60 stays 60 on a 60 Hz screen');
  assert.equal(pickDisplayMode(29.968, modes, 1), 3, 'measured 29.97 goes to 59.94 Hz');
  assert.equal(pickDisplayMode(25.04, modes, 1), 2);
});

test('with no matching mode, a screen the app had switched goes back to its usual mode (0)', () => {
  const box = [mode(1, 60), mode(2, 50)];
  assert.equal(pickDisplayMode(59.94, box, 2, { switched: true }), 0, 'left at 50 Hz it would drop 10 frames a second');
  assert.equal(pickDisplayMode(29.97, box, 2, { switched: true }), 0);
  assert.equal(pickDisplayMode(59.94, box, 2), null, 'a screen the app never switched is left as the user set it');
  assert.equal(pickDisplayMode(25, box, 2, { switched: true }), null, 'still in step: keep the switched mode');
  assert.equal(pickDisplayMode(60, box, 2, { switched: true }), 1, 'a matching mode is still preferred');
});
