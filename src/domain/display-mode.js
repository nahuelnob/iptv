// Frame-rate matching: a TV box usually drives the screen at 60 Hz, while many channels are 25 or
// 50 fps (or 29.97). When the refresh is not a whole multiple of the video's frame rate, frames do
// not land on refreshes evenly and the player drops some: a steady trickle of lost frames on every
// channel. The Android app measures the real frame rate (src/ui/player.js) and asks the screen for a
// mode, at the same resolution, whose refresh is a whole multiple of it.

// A refresh is "in step" with a frame rate when it is a whole multiple of it within this margin.
// 60 Hz against 59.94 fps is 0.1% off: a frame dropped every ~17 s, so it does not count as in step.
const IN_STEP = 0.0005;

// Measured rates are averages of frame timestamps: snap them to the broadcast rate they belong to.
const STANDARD_RATES = [23.976, 24, 25, 29.97, 30, 48, 50, 59.94, 60];
const SNAP = 0.01;

// Mode id that releases the app's preference: the screen goes back to its usual mode.
export const USUAL_MODE = 0;

// modes: [{ id, width, height, refreshRate }]; currentId: the mode the screen is in now;
// switched: the app changed the mode earlier (for another channel).
// Returns the id of the mode to switch to, USUAL_MODE to give the screen back its usual mode, or
// null to leave it as it is.
export function pickDisplayMode(fps, modes, currentId, { switched = false } = {}) {
  const rate = snapRate(fps);
  if (!rate) return null;

  const current = (modes || []).find((mode) => mode.id === currentId);
  if (!current || inStep(current.refreshRate, rate)) return null;

  const candidates = modes.filter((mode) =>
    mode.width === current.width && mode.height === current.height && inStep(mode.refreshRate, rate));
  // No mode fits: a mode the app chose for another channel (50 Hz for a 25 fps one) may fit this
  // one far worse than the usual 60 Hz, so give the usual mode back.
  if (!candidates.length) return switched ? USUAL_MODE : null;

  // The closest refresh to the current one: 25 fps on a 60 Hz screen goes to 50 Hz, not 25 Hz.
  candidates.sort((a, b) =>
    Math.abs(a.refreshRate - current.refreshRate) - Math.abs(b.refreshRate - current.refreshRate));
  return candidates[0].id;
}

export function describeRates(fps, refreshRate) {
  if (!fps && !refreshRate) return '—';
  const video = fps ? `${round(snapRate(fps))} fps` : 'midiendo';
  return refreshRate ? `${video} · pantalla ${round(refreshRate)} Hz` : video;
}

function snapRate(fps) {
  if (!(fps > 0)) return null;
  // The closest standard rate, not the first one near: 60 and 59.94 are only 0.1% apart.
  const closest = STANDARD_RATES.reduce((best, rate) =>
    Math.abs(fps - rate) < Math.abs(fps - best) ? rate : best);
  return Math.abs(fps - closest) / closest < SNAP ? closest : fps;
}

function inStep(refreshRate, fps) {
  const ratio = refreshRate / fps;
  const whole = Math.round(ratio);
  return whole >= 1 && Math.abs(ratio - whole) / whole < IN_STEP;
}

function round(value) {
  return String(Math.round(value * 100) / 100);
}
