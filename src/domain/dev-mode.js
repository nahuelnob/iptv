// Developer options (changing the playlist) stay hidden until the viewer presses OK seven times in a
// row on Inicio in the side menu, the way Android hides them behind the build number. The same
// gesture hides them again.

export const TAPS_TO_TOGGLE = 7;
// A longer pause between two OKs starts the count over.
export const TAP_GAP_MS = 1500;
// The hint shows once this many OKs or fewer are left.
const HINT_FROM = 3;

// streak: the previous result's streak (null to start); now: the time of this OK, in ms.
export function nextTap(streak, now) {
  const continues = streak && now - streak.last <= TAP_GAP_MS;
  const count = (continues ? streak.count : 0) + 1;
  const toggle = count === TAPS_TO_TOGGLE;

  return {
    streak: toggle ? null : { count, last: now },
    remaining: toggle ? 0 : TAPS_TO_TOGGLE - count,
    toggle,
  };
}

// enabling: true when the options are off and the gesture would turn them on.
export function tapHint(remaining, enabling) {
  if (remaining < 1 || remaining > HINT_FROM) return null;
  const action = enabling ? 'activar' : 'desactivar';
  return remaining === 1
    ? `Te falta 1 toque para ${action} las opciones de desarrollador.`
    : `Te faltan ${remaining} toques para ${action} las opciones de desarrollador.`;
}
