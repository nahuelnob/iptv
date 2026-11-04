import { devProxyAvailable, devProxyUrl } from './dev-proxy.js';

const LAST_URL_KEY = 'iptv.lastPlaylistUrl';
const TIMEOUT_MS = 15000;

const CLOUDFLARE_PROXY =
  'https://proxy.nahue-santini.workers.dev/?url=';

// Carga una playlist desde una URL.
// Orden de intentos:
//   1) https: directo (si el servidor permite CORS)
//   2) proxy de Cloudflare (también evita Mixed Content con http)
//   3) proxy local de desarrollo, si está disponible
export async function loadFromUrl(url) {
  const host = hostOf(url);

  // Android app: Capacitor's native HTTP client is not subject to CORS or mixed content, and the
  // request leaves from the device itself, so provider lists that refuse datacenter IPs still load.
  const nativeHttp = nativeHttpClient();
  if (nativeHttp) return loadNatively(nativeHttp, url, host);

  const routes = [];

  if (!url.startsWith('http://')) {
    routes.push(() => url);
  }

  routes.push(() => CLOUDFLARE_PROXY + encodeURIComponent(url));

  routes.push(async () =>
    (await devProxyAvailable().catch(() => false))
      ? devProxyUrl(url)
      : null
  );

  let lastStatus = null;
  let timedOut = false;

  for (const route of routes) {
    const target = await route();

    if (!target) continue;

    try {
      const response = await fetch(target, {
        signal: timeoutSignal()
      });

      if (response.ok) return response.text();

      lastStatus = response.status;
      timedOut = false;

    } catch (error) {
      timedOut = error?.name === 'TimeoutError';
    }
  }

  if (timedOut) {
    throw timeoutError(host);
  }

  if (lastStatus) {
    throw new Error(
      `${host} respondió con el error ${lastStatus}. Revisá la dirección y volvé a intentar.`
    );
  }

  throw connectError(host);
}

// Called explicitly instead of enabling Capacitor's fetch patch: the patched fetch ignores
// AbortSignal, so the 15-second timeout would be lost.
async function loadNatively(http, url, host) {
  let response;

  try {
    response = await http.get({
      url,
      responseType: 'text',
      connectTimeout: TIMEOUT_MS,
      readTimeout: TIMEOUT_MS,
    });
  } catch (error) {
    throw error?.code === 'SocketTimeoutException' ? timeoutError(host) : connectError(host);
  }

  if (response.status < 200 || response.status >= 300) {
    throw new Error(
      `${host} respondió con el error ${response.status}. Revisá la dirección y volvé a intentar.`
    );
  }

  return String(response.data ?? '');
}

function nativeHttpClient() {
  const capacitor = globalThis.window?.Capacitor;
  if (!capacitor?.isNativePlatform?.()) return null;
  return capacitor.Plugins?.CapacitorHttp ?? null;
}

export function loadFromFile(file) {
  return file.text();
}

// Nombre visible de la playlist.
export function playlistName(url) {
  try {
    const { pathname, hostname } = new URL(url);
    const last = pathname.split('/').filter(Boolean).pop();

    return last ? decodeURIComponent(last) : hostname;
  } catch {
    return url;
  }
}

// Guardar última URL utilizada.
export function rememberUrl(url) {
  try {
    localStorage.setItem(LAST_URL_KEY, url);
  } catch {
    // localStorage es opcional.
  }
}

export function lastUrl() {
  try {
    return localStorage.getItem(LAST_URL_KEY) || '';
  } catch {
    return '';
  }
}

function connectError(host) {
  return new Error(
    `No se pudo conectar con ${host}. El servidor puede estar caído o bloquear los pedidos del navegador (CORS). Revisá la dirección o tu conexión y volvé a intentar.`
  );
}

function timeoutError(host) {
  return new Error(
    `${host} no respondió en 15 segundos. Revisá la dirección o tu conexión y volvé a intentar.`
  );
}

// Compatibilidad con navegadores antiguos.
function timeoutSignal() {
  return typeof AbortSignal.timeout === 'function'
    ? AbortSignal.timeout(TIMEOUT_MS)
    : undefined;
}

function hostOf(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}