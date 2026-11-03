// Playlist loading adapters: the UI asks for text, these decide where it comes from.
import { devProxyAvailable, devProxyUrl } from './dev-proxy.js';

const LAST_URL_KEY = 'iptv.lastPlaylistUrl';

export async function loadFromUrl(url) {
  let response;
  try {
    response = await fetch(url);
  } catch {
    // fetch() rejects without a reason on CORS blocks; the dev proxy is not subject to CORS.
    if (await devProxyAvailable()) response = await fetch(devProxyUrl(url)).catch(() => null);
    if (!response) {
      throw new Error('Could not reach that URL. The server may be down or may block browser requests (CORS).');
    }
  }
  if (!response.ok) throw new Error(`The server answered ${response.status} ${response.statusText}.`);
  return response.text();
}

export function loadFromFile(file) {
  return file.text();
}

// localStorage can be unavailable (private mode, some TV webviews): treat it as optional.
export function rememberUrl(url) {
  try { localStorage.setItem(LAST_URL_KEY, url); } catch { /* optional convenience */ }
}

export function lastUrl() {
  try { return localStorage.getItem(LAST_URL_KEY) || ''; } catch { return ''; }
}
