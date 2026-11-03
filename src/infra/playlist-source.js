// Playlist loading adapters: the UI asks for text, these decide where it comes from.
// Error messages are user-facing (design/PLAN.md section 5).
import { devProxyAvailable, devProxyUrl } from './dev-proxy.js';

const LAST_URL_KEY = 'iptv.lastPlaylistUrl';
const TIMEOUT_MS = 15000;

export async function loadFromUrl(url) {
  const host = hostOf(url);
  let response;
  let viaProxy = false;
  try {
    response = await fetch(url, { signal: timeoutSignal() });
  } catch (error) {
    if (error?.name === 'TimeoutError') throw timeoutError(host);
    // fetch() rejects without a reason on CORS blocks; the dev proxy is not subject to CORS.
    if (await devProxyAvailable()) {
      viaProxy = true;
      response = await fetch(devProxyUrl(url), { signal: timeoutSignal() }).catch((proxyError) => {
        if (proxyError?.name === 'TimeoutError') throw timeoutError(host);
        return null;
      });
    }
    if (!response) throw connectError(host);
  }
  // The dev proxy answers 5xx when it cannot reach the server itself: that is not the server's answer.
  if (viaProxy && response.status >= 500) throw connectError(host);
  if (!response.ok) {
    throw new Error(`${host} respondió con el error ${response.status}. Revisá la dirección y volvé a intentar.`);
  }
  return response.text();
}

export function loadFromFile(file) {
  return file.text();
}

// What the header shows as the list's name: "playlist_argentina.m3u8", or the host for bare URLs.
export function playlistName(url) {
  try {
    const { pathname, hostname } = new URL(url);
    const last = pathname.split('/').filter(Boolean).pop();
    return last ? decodeURIComponent(last) : hostname;
  } catch {
    return url;
  }
}

// localStorage can be unavailable (private mode, some TV webviews): treat it as optional.
export function rememberUrl(url) {
  try { localStorage.setItem(LAST_URL_KEY, url); } catch { /* optional convenience */ }
}

export function lastUrl() {
  try { return localStorage.getItem(LAST_URL_KEY) || ''; } catch { return ''; }
}

function connectError(host) {
  return new Error(`No se pudo conectar con ${host}. El servidor puede estar caído o bloquear los pedidos del navegador (CORS). Revisá la dirección o tu conexión y volvé a intentar.`);
}

function timeoutError(host) {
  return new Error(`${host} no respondió en 15 segundos. Revisá la dirección o tu conexión y volvé a intentar.`);
}

// Older TV webviews lack AbortSignal.timeout; they simply wait for the network stack.
function timeoutSignal() {
  return typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(TIMEOUT_MS) : undefined;
}

function hostOf(url) {
  try { return new URL(url).hostname; } catch { return url; }
}
