// Remembers whether the developer options are on, per device, in localStorage.
// Storage can throw (private mode, some TV webviews): then they stay off, the safe default.
const DEV_MODE_KEY = 'iptv.devOptions';

export function isDevMode() {
  try {
    return localStorage.getItem(DEV_MODE_KEY) === 'on';
  } catch {
    return false;
  }
}

export function saveDevMode(on) {
  try {
    if (on) localStorage.setItem(DEV_MODE_KEY, 'on');
    else localStorage.removeItem(DEV_MODE_KEY);
  } catch { /* in memory only */ }
}
