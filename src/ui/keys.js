// Remote controls send platform-specific key codes for Back. Arrows and Enter are standard.
const BACK_KEY_CODES = new Set([
  461,   // webOS (LG)
  10009, // Tizen (Samsung)
]);

export function directionOf(event) {
  switch (event.key) {
    case 'ArrowUp': return 'up';
    case 'ArrowDown': return 'down';
    case 'ArrowLeft': return 'left';
    case 'ArrowRight': return 'right';
    default: return null;
  }
}

export function isBack(event) {
  return event.key === 'Escape' || event.key === 'GoBack' || event.key === 'BrowserBack'
    || BACK_KEY_CODES.has(event.keyCode);
}

// While watching, ▲ ▼ move a cursor through the channel column without leaving the channel on
// screen; OK switches to it.
export function browseStepOf(event) {
  switch (event.key) {
    case 'ArrowUp': return -1;
    case 'ArrowDown': return 1;
    default: return 0;
  }
}

// CH+ / CH- (PageUp / PageDown on a keyboard) switch to the channel above or below right away.
export function channelStepOf(event) {
  switch (event.key) {
    case 'ChannelUp': case 'PageUp': return -1;
    case 'ChannelDown': case 'PageDown': return 1;
    default: return 0;
  }
}
