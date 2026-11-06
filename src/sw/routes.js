// Routing rules for the service worker (src/sw/sw.js), kept pure so node tests can import them.
// The worker answers every request with one of these strategies:
//   'page'        the page itself (navigations): network first, the cached copy only when offline. In
//                 the Android app Capacitor injects its bridge (window.Capacitor, which turns on the
//                 native player) into the HTML it proxies; a cached page would miss a fresh bridge.
//   'swr'         the app's other files: answer from the cache at once, refresh it in the background.
//   'cache-first' pinned third-party files (Google Fonts, hls.js): cache once, then never ask again.
//   'image'       channel logos from any host: cache-first, in a separate cache capped by entries.
//   'network'     everything else, above all streams and the update check: the worker stays out of
//                 the way (no respondWith), so the request behaves exactly as without a worker.

export const IMAGE_CACHE_LIMIT = 300;

// Prefix every cache of this app shares, so activate never deletes caches it does not own.
const PREFIX = 'nodo-';

// Logos survive deploys: their URLs never change, and fetching ~300 of them again on a slow TV box
// after every deploy is what the cache is for. Bump this only if the image cache format changes.
const IMAGE_CACHE_GENERATION = '1';

// Cache names for one build. The app and static caches carry the build stamp, so every deploy
// starts them fresh and the old ones are deleted on activate.
export function cacheNames(version) {
  return {
    app: `${PREFIX}app-${version}`,
    static: `${PREFIX}static-${version}`,
    images: `${PREFIX}images-${IMAGE_CACHE_GENERATION}`,
  };
}

// Caches of this app that a worker of `version` no longer uses.
export function staleCaches(existing, version) {
  const current = Object.values(cacheNames(version));
  return existing.filter((name) => name.startsWith(PREFIX) && !current.includes(name));
}

const STREAM_EXTENSIONS = /\.(m3u8|ts|m4s|aac|mp4|m4a|m4v|mpd|webm)$/i;
const MEDIA_DESTINATIONS = ['audio', 'video', 'track'];
const IMAGE_EXTENSIONS = /\.(png|jpe?g|gif|webp|svg|ico|avif)$/i;
const NEVER_CACHED_HOSTS = /(^|\.)(api\.github\.com|github\.com|githubusercontent\.com)$/i;
const PINNED_HLS = /^\/npm\/hls\.js@\d[^/]*\//;

/**
 * @param {{ url: string, method?: string, destination?: string, mode?: string, scope: string }} request
 *   `scope` is the worker's registration scope (for example https://nahuelnob.github.io/iptv/).
 * @returns {'page' | 'swr' | 'cache-first' | 'image' | 'network'}
 */
export function strategyFor({ url, method = 'GET', destination = '', mode = '', scope }) {
  if (method !== 'GET') return 'network';

  const target = new URL(url);
  const base = new URL(scope);

  // Never cached: live streams, proxies, the Android update check and its downloads.
  if (STREAM_EXTENSIONS.test(target.pathname)) return 'network';
  if (MEDIA_DESTINATIONS.includes(destination)) return 'network';
  if (target.pathname.endsWith('/proxy') || target.pathname.includes('/proxy/')) return 'network';
  if (target.hostname.endsWith('workers.dev')) return 'network';
  if (NEVER_CACHED_HOSTS.test(target.hostname)) return 'network';

  if (target.origin === base.origin) {
    if (!target.pathname.startsWith(base.pathname)) return 'network';
    return mode === 'navigate' || destination === 'document' ? 'page' : 'swr';
  }

  if (target.protocol !== 'https:') return 'network';

  if (target.hostname === 'fonts.googleapis.com' || target.hostname === 'fonts.gstatic.com') {
    return 'cache-first';
  }
  if (target.hostname === 'cdn.jsdelivr.net' && PINNED_HLS.test(target.pathname)) {
    return 'cache-first';
  }

  // Chrome 66 fills request.destination, but match the extension too in case a WebView leaves it empty.
  if (destination === 'image' || (destination === '' && IMAGE_EXTENSIONS.test(target.pathname))) {
    return 'image';
  }

  return 'network';
}
