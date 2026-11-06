// Service worker: the app opens from the device on a slow TV box. scripts/build-web.mjs bundles this
// file into site/sw.js as a classic script for Chrome 66 (no module workers there) and defines
// __SW_VERSION__ with a hash of the build, so every deploy installs a new worker and new caches.
// Registered by src/infra/service-worker.js, never on localhost (npm start serves the raw source).
//
// Tradeoff: the app's own files (not the page) are stale-while-revalidate, so a new deploy shows up
// on the launch after the one that downloaded it.
import { IMAGE_CACHE_LIMIT, cacheNames, staleCaches, strategyFor } from './routes.js';

/* global __SW_VERSION__ */
const VERSION = typeof __SW_VERSION__ === 'string' ? __SW_VERSION__ : 'dev';
const CACHES = cacheNames(VERSION);

// The app shell, cached on install so even the first launch after an update opens from the device.
const SHELL = ['./', 'src/main.js', 'styles/tokens.css', 'styles/app.css', 'playlists/mi-lista.m3u', 'assets/favicon.svg'];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(precacheShell().catch(() => {}));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(staleCaches(names, VERSION).map((name) => caches.delete(name))))
      .catch(() => {})
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const strategy = strategyFor({
    url: request.url,
    method: request.method,
    destination: request.destination,
    mode: request.mode,
    scope: self.registration.scope,
  });
  // 'network': no respondWith at all, so streams, proxies and the update check go straight to the
  // network exactly as they would without a worker (mixed-content http streams included).
  if (strategy === 'network') return;

  const handlers = { page: networkFirstPage, swr: staleWhileRevalidate, 'cache-first': cacheFirst, image: cacheImage };
  // Background work (cache writes, refreshes) is collected here and kept alive with one waitUntil
  // called synchronously, which every WebView accepts (a late waitUntil can throw on old Chrome).
  const background = [];
  const keepAlive = (promise) => background.push(promise.catch(() => {}));
  // Whatever goes wrong with the cache (quota, storage disabled), the page still gets the network.
  const answer = handlers[strategy](request, keepAlive).catch(() => fetch(request));
  event.respondWith(answer);
  event.waitUntil(answer.catch(() => {}).then(() => Promise.all(background)));
});

async function precacheShell() {
  const cache = await caches.open(CACHES.app);
  await Promise.all(SHELL.map(async (path) => {
    const url = new URL(path, self.registration.scope).href;
    // "reload" skips the HTTP cache, so the new worker never stores files of the previous deploy.
    // The page asks for HTML like a navigation does: in the Android app Capacitor injects its bridge
    // only into responses to requests that accept text/html, and the offline copy needs it.
    const headers = path === './' ? { Accept: 'text/html' } : {};
    const response = await fetch(new Request(url, { cache: 'reload', credentials: 'same-origin', headers }));
    if (isStorable(response)) await cache.put(url, response);
  }).map((step) => step.catch(() => {})));
}

// The page: always from the network when there is one (the navigation request keeps its
// Accept: text/html, so Capacitor injects a fresh bridge), from the cache only offline.
async function networkFirstPage(request, keepAlive) {
  const key = stripSearch(request.url);
  const cache = await caches.open(CACHES.app);

  try {
    const response = await fetch(request);
    if (isStorable(response) && !response.redirected) keepAlive(cache.put(key, response.clone()));
    return response;
  } catch (error) {
    const cached = (await cache.match(key)) || (await cache.match(self.registration.scope));
    if (cached) return cached;
    throw error;
  }
}

// Answer from the cache at once when there is a copy, and refresh it in the background.
async function staleWhileRevalidate(request, keepAlive) {
  const navigation = request.mode === 'navigate';
  // Navigations are stored without their query, so ?anything still opens the cached page.
  const key = navigation ? stripSearch(request.url) : request.url;
  const cache = await caches.open(CACHES.app);

  // "no-cache" revalidates with the server (a cheap 304 on GitHub Pages) instead of reusing the
  // browser's HTTP copy, which can lag a deploy by its max-age.
  const refresh = fetch(new Request(key, { cache: 'no-cache', credentials: 'same-origin' }))
    .then(async (response) => {
      if (isStorable(response)) await cache.put(key, response.clone());
      return response;
    });

  const cached = (await cache.match(key)) || (navigation ? await cache.match(self.registration.scope) : undefined);
  if (cached) {
    // A failed background refresh never reaches the page: the cached copy was already answered.
    keepAlive(refresh);
    return cached;
  }
  // A redirected response cannot answer a navigation: let the browser follow it itself.
  return refresh.then((response) => (navigation && response.redirected ? fetch(request) : response));
}

// Pinned third-party files (Google Fonts, hls.js@x.y.z): their content never changes for a URL.
async function cacheFirst(request, keepAlive) {
  const cache = await caches.open(CACHES.static);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok || response.type === 'opaque') keepAlive(cache.put(request, response.clone()));
  return response;
}

// Channel logos: cache-first in their own capped cache. Asked with CORS first, because Chrome
// counts each opaque (no-cors) response as megabytes of quota and the cache would fill after a few
// dozen logos; hosts without CORS headers fall back to the page's own no-cors request.
async function cacheImage(request, keepAlive) {
  const cache = await caches.open(CACHES.images);
  const cached = await cache.match(request.url);
  if (cached) return cached;

  let response;
  try {
    response = await fetch(request.url, { mode: 'cors', credentials: 'omit' });
    if (!response.ok) response = await fetch(request);
  } catch {
    response = await fetch(request);
  }
  if (response.ok || response.type === 'opaque') {
    keepAlive(cache.put(request.url, response.clone()).then(() => trim(cache)));
  }
  return response;
}

// Keep at most IMAGE_CACHE_LIMIT logos, dropping the oldest (keys come back in insertion order).
async function trim(cache) {
  const keys = await cache.keys();
  const excess = keys.length - IMAGE_CACHE_LIMIT;
  for (let i = 0; i < excess; i += 1) await cache.delete(keys[i]);
}

function isStorable(response) {
  // Redirected responses cannot answer a navigation, so they are never stored.
  return response.ok && response.type === 'basic' && !response.redirected;
}

function stripSearch(url) {
  const clean = new URL(url);
  clean.search = '';
  clean.hash = '';
  return clean.href;
}
