// The video surface the Android app draws on, chosen per device from the diagnostics panel.
// TextureView unless changed; storage that throws (some TV webviews) keeps the default.
const SURFACE_KEY = 'iptv.videoSurface';

export function savedSurface() {
  try {
    return localStorage.getItem(SURFACE_KEY) === 'surface' ? 'surface' : 'texture';
  } catch {
    return 'texture';
  }
}

export function saveSurface(surface) {
  try {
    if (surface === 'surface') localStorage.setItem(SURFACE_KEY, 'surface');
    else localStorage.removeItem(SURFACE_KEY);
  } catch { /* in memory only */ }
}
