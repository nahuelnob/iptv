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

// While watching, ▲ / CH+ go to the channel above and ▼ / CH- to the one below.
export function channelStepOf(event) {
  switch (event.key) {
    case 'ArrowUp': case 'ChannelUp': case 'PageUp': return -1;
    case 'ArrowDown': case 'ChannelDown': case 'PageDown': return 1;
    default: return 0;
  }
}
