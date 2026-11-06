// Registers the service worker (src/sw/sw.js, built into site/sw.js) so the app, the list and the
// logos open from the device. Only on the published site: never on localhost, where npm start serves
// the raw source and a worker would keep answering with stale cached files.
const LOCAL_HOSTS = ['localhost', '127.0.0.1', '[::1]'];

export function canRegisterServiceWorker(nav = globalThis.navigator, loc = globalThis.location) {
  return Boolean(nav && loc)
    && 'serviceWorker' in nav
    && loc.protocol === 'https:'
    && !LOCAL_HOSTS.includes(loc.hostname);
}

export function registerServiceWorker() {
  try {
    if (!canRegisterServiceWorker()) return;
    // Relative to the page, so the scope is /iptv/ on GitHub Pages. A failure only costs the cache.
    navigator.serviceWorker.register('sw.js').catch(() => {});
  } catch {
    // Never let the cache break the app.
  }
}
