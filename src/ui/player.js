// Full-screen player overlay. Prefers hls.js (loaded as a global from index.html) wherever
// Media Source Extensions exist, and falls back to native HLS (iOS Safari, some TV webviews).
// Native support alone is not enough: recent Chrome answers "maybe" to canPlayType for HLS
// but reports errors with far less detail than hls.js.
// YouTube channels play through the official embed in an iframe instead.
//
// ▲ ▼ (and CH+ CH-) switch to the channel above/below in the list the viewer came from.
// The title pill and the bottom strip are the only controls: they hide after a few idle seconds.
import { isBack, channelStepOf, directionOf } from './keys.js';
import { focusElement } from './spatial-nav.js';
import { qualityLabel } from './tiles.js';
import { monogram } from '../domain/monogram.js';
import { neighborChannel, neighborWindow } from '../domain/zapping.js';
import { parseYouTubeUrl, youtubeEmbedUrl } from '../domain/youtube.js';
import { KNOWN_YOUTUBE_CHANNELS } from '../data/youtube-channels.js';
import { devProxyAvailable, devProxyUrl } from '../infra/dev-proxy.js';

// Holding ▼ walks the strip without starting a stream per channel (PLAN section 3).
const ZAP_DELAY_MS = 400;
const IDLE_MS = 4000;
// If history.back() produces no popstate (seen once in testing, cause unknown), close anyway.
const CLOSE_FALLBACK_MS = 600;
const GENERIC_CAUSE = 'La señal no responde o el navegador no la admite.';

export function createPlayer(root, {
  isFavorite = () => false,
  onToggleFavorite = () => false,
  onWatch = () => {},
  onClose = () => {},
  numberOf = () => '',
} = {}) {
  const video = root.querySelector('video');
  let embed = root.querySelector('[data-player-embed]');
  const number = root.querySelector('[data-player-no]');
  const title = root.querySelector('[data-player-name]');
  const meta = root.querySelector('[data-player-meta]');
  const notice = root.querySelector('[data-player-notice]');
  const status = root.querySelector('[data-player-status]');
  const stripList = root.querySelector('[data-strip-list]');
  const favoriteButton = root.querySelector('[data-player-fav]');
  const unmuteButton = root.querySelector('[data-player-unmute]');
  const closeButton = root.querySelector('[data-player-close]');
  let hls = null;
  let current = null; // the playback attempt in progress; late errors from older ones are ignored
  let returnFocusTo = null;
  let channel = null;
  let opened = null;
  let list = [];
  let zapTimer = null;
  let idleTimer = null;
  let closing = false;
  let closeFallback = null;
  let fullscreenOwned = false;
  let focusAfterClose = null; // where focus landed after the last close (a tile), to restore it
  let reenterFullscreen = false; // reopened while the previous exit was still in progress

  closeButton.addEventListener('click', close);
  favoriteButton.addEventListener('click', () => {
    onToggleFavorite(channel);
    renderFavorite();
  });
  unmuteButton.addEventListener('click', () => {
    video.muted = false;
    unmuteButton.hidden = true;
    focusElement(closeButton);
  });

  root.addEventListener('keydown', (event) => {
    if (isBack(event)) {
      event.preventDefault();
      close();
      return;
    }
    const step = channelStepOf(event);
    if (step) {
      event.preventDefault();
      wake();
      zap(step);
      return;
    }
    // While the controls are hidden, the first key only brings them back, so nothing invisible gets activated.
    const idle = root.hasAttribute('data-idle');
    wake();
    if (idle && !directionOf(event)) event.preventDefault();
  });
  root.addEventListener('pointermove', wake);

  // On Android TV browsers (and Capacitor's WebView) the remote's Back key never reaches the page
  // as a key: it navigates history. Opening the player pushes a history entry, so Back pops it.
  window.addEventListener('popstate', () => {
    if (!root.hidden) hide();
  });

  // Chrome consumes Esc in fullscreen and only reports fullscreenchange: leaving fullscreen closes the player.
  for (const type of ['fullscreenchange', 'webkitfullscreenchange']) {
    document.addEventListener(type, () => {
      if (fullscreenElement() === root) {
        fullscreenOwned = true;
        refocusIfLost(closeButton);
      } else if (reenterFullscreen) {
        // The exit belongs to the previous channel; the reopened player asks again now that it finished.
        reenterFullscreen = false;
        if (!root.hidden) enterFullscreen();
      } else if (fullscreenOwned) {
        fullscreenOwned = false;
        if (!root.hidden) close();
      } else if (root.hidden) {
        refocusIfLost(focusAfterClose);
      }
    });
  }

  // Android WebView drops focus to <body> when it enters or leaves fullscreen, after our own focus()
  // calls have run. With no focused element the remote's arrows go nowhere, so put focus back.
  // The view swap can finish after fullscreenchange, so check again a little later.
  function refocusIfLost(element) {
    for (const delay of [50, 400]) {
      setTimeout(() => {
        const lost = !document.activeElement || document.activeElement === document.body;
        if (lost && element?.isConnected) focusElement(element);
      }, delay);
    }
  }

  video.addEventListener('playing', () => setStatus(null));
  video.addEventListener('waiting', () => setStatus('Cargando…'));

  // list: the channels the viewer was browsing, in order (category, favorites, search results…).
  function open(selected, browsingList = [selected]) {
    returnFocusTo = document.activeElement;
    opened = selected;
    list = browsingList.includes(selected) ? browsingList : [selected];
    closing = false;
    root.hidden = false;
    // Must run inside the OK/click that opened the player: browsers require a user gesture for it.
    enterFullscreen();
    if (!history.state?.player) history.pushState({ player: true }, '');
    show(selected);
    focusElement(favoriteButton);
    wake();
    start(selected);
  }

  function zap(step) {
    const next = neighborChannel(list, channel, step);
    if (next === channel) return;
    teardown();
    show(next);
    setStatus(`Conectando con ${next.name}…`);
    clearTimeout(zapTimer);
    zapTimer = setTimeout(() => start(next), ZAP_DELAY_MS);
  }

  function start(target) {
    if (target !== channel || root.hidden) return;
    onWatch(target);
    if (parseYouTubeUrl(target.url)) playYouTube(target.url);
    else play(target.url);
  }

  function show(target) {
    channel = target;
    number.textContent = numberOf(target);
    title.textContent = target.name;
    meta.textContent = qualityLabel(target.quality) ?? '';
    meta.hidden = !target.quality;
    renderFavorite();
    stripList.replaceChildren(...neighborWindow(list, target).map((neighbor) => {
      const item = document.createElement('li');
      item.className = 'mini';
      item.setAttribute('aria-current', String(neighbor === target));
      const mono = document.createElement('b');
      mono.textContent = monogram(neighbor.name);
      const name = document.createElement('span');
      name.textContent = neighbor.name;
      item.append(mono, name);
      return item;
    }));
    const warnings = [
      target.geoBlocked ? 'Solo Argentina: esta señal se puede ver únicamente desde Argentina.' : null,
      target.unstable ? 'Horario parcial: puede que este canal no esté transmitiendo ahora.' : null,
    ].filter(Boolean);
    notice.hidden = !warnings.length;
    notice.textContent = warnings.length ? `${warnings.join(' ')} Presioná ▼ para pasar al canal siguiente.` : '';
  }

  function renderFavorite() {
    const favorite = isFavorite(channel);
    favoriteButton.setAttribute('aria-pressed', String(favorite));
    favoriteButton.setAttribute('aria-label', favorite ? 'Quitar de favoritos' : 'Agregar a favoritos');
  }

  function playYouTube(url) {
    teardown();
    const src = youtubeEmbedUrl(url, KNOWN_YOUTUBE_CHANNELS);
    if (!src) {
      return fail('Este canal de YouTube figura por nombre y no se conoce su ID: hay que agregarlo en src/data/youtube-channels.js.');
    }
    video.hidden = true;
    replaceEmbed(src);
    // The embed reports nothing back without the IFrame API, so explain the likely causes up front.
    setStatus('Si YouTube muestra un error, el canal no está transmitiendo ahora o no permite verse fuera de YouTube.');
    setTimeout(() => { if (embed.src === src) setStatus(null); }, 6000);
  }

  function play(url, { viaProxy = false } = {}) {
    teardown();
    const attempt = { url, viaProxy };
    current = attempt;
    setStatus(viaProxy ? 'El navegador bloqueó la señal. Reintentando con el proxy local…' : `Conectando con ${channel.name}…`);

    if (!viaProxy && location.protocol === 'https:' && url.startsWith('http:')) {
      return retryOrFail(attempt, 'La señal usa HTTP y el navegador la bloquea en las páginas HTTPS.');
    }

    const src = viaProxy ? devProxyUrl(url) : url;
    const isHls = /\.m3u8(\?|$)/i.test(url);
    const Hls = window.Hls;
    if (isHls && Hls?.isSupported()) {
      hls = new Hls({ enableWorker: true, lowLatencyMode: true });
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (!data.fatal || current !== attempt) return;
        // A decoding problem will not go away through the proxy; a network/CORS block might.
        if (data.type === 'networkError') retryOrFail(attempt, describeHlsError(data));
        else fail(describeHlsError(data));
      });
      hls.loadSource(src);
      hls.attachMedia(video);
    } else {
      video.src = src;
    }
    autoplay(attempt);
  }

  // Without native controls nothing else could start playback: if sound is refused, play muted
  // and offer "Activar sonido".
  function autoplay(attempt) {
    video.play().catch((error) => {
      if (error?.name !== 'NotAllowedError' || current !== attempt) return;
      video.muted = true;
      unmuteButton.hidden = false;
      video.play().catch(() => {});
    });
  }

  async function retryOrFail(attempt, cause) {
    if (!attempt.viaProxy && await devProxyAvailable() && current === attempt) {
      return play(attempt.url, { viaProxy: true });
    }
    if (current === attempt) {
      fail(attempt.viaProxy ? 'La señal no respondió, ni siquiera a través del proxy local. Probablemente esté fuera del aire.' : cause);
    }
  }

  // Closing from the UI (button, Esc) goes through history too, so no stale entry is left behind.
  function close() {
    if (root.hidden || closing) return;
    closing = true;
    if (history.state?.player) {
      history.back();
      closeFallback = setTimeout(() => { if (!root.hidden) hide(); }, CLOSE_FALLBACK_MS);
    } else {
      hide();
    }
  }

  function hide() {
    clearTimeout(closeFallback);
    clearTimeout(zapTimer);
    clearTimeout(idleTimer);
    teardown();
    root.hidden = true;
    closing = false;
    // Forget ownership before exiting, so the late exit event cannot close a player reopened meanwhile.
    fullscreenOwned = false;
    reenterFullscreen = false;
    exitFullscreen();
    if (returnFocusTo?.isConnected) focusElement(returnFocusTo);
    // Remember the intended tile, not document.activeElement: while the WebView is still leaving
    // fullscreen it can ignore focus(), and activeElement would already be <body>.
    const intended = onClose(opened);
    focusAfterClose = intended ?? (returnFocusTo?.isConnected ? returnFocusTo : null);
  }

  function teardown() {
    current = null;
    hls?.destroy();
    hls = null;
    video.removeAttribute('src');
    video.load();
    video.hidden = false;
    replaceEmbed(null);
  }

  // Changing src on an iframe that already loaded adds a joint session history entry, so the remote's
  // Back (a history step on Android TV) would move the iframe back instead of closing the player.
  // A freshly inserted iframe's first load adds none, and removing it drops the entries it made.
  function replaceEmbed(src) {
    const next = embed.cloneNode(false);
    next.removeAttribute('src');
    if (src) next.src = src;
    next.hidden = !src;
    embed.replaceWith(next);
    embed = next;
  }

  function fail(cause) {
    teardown();
    setStatus(`No se pudo reproducir ${channel.name}. ${cause} Presioná ▼ para pasar al canal siguiente.`, true);
  }

  function setStatus(message, isError = false) {
    status.hidden = !message;
    status.textContent = message ?? '';
    status.classList.toggle('player__status--error', isError);
    // The controls stay up while a message is showing; the idle countdown restarts when it clears.
    wake();
  }

  function wake() {
    root.removeAttribute('data-idle');
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      if (status.hidden && !root.hidden) root.setAttribute('data-idle', '');
    }, IDLE_MS);
  }

  function enterFullscreen() {
    const request = root.requestFullscreen ?? root.webkitRequestFullscreen;
    if (!request) return;
    if (fullscreenElement()) {
      reenterFullscreen = true; // the previous exit is still running; ask again when it ends
      return;
    }
    try {
      request.call(root)?.catch?.(() => { /* webviews without fullscreen: the overlay is full-window anyway */ });
    } catch { /* same */ }
  }

  function exitFullscreen() {
    if (fullscreenElement() !== root) return;
    const exit = document.exitFullscreen ?? document.webkitExitFullscreen;
    try { exit?.call(document)?.catch?.(() => {}); } catch { /* already out */ }
  }

  video.addEventListener('error', () => {
    // Native playback reports no cause, so a CORS block looks like any other failure: try the proxy.
    if (!hls && video.error && current) {
      retryOrFail(current, 'El navegador no admite el formato de esta señal, o el canal está fuera del aire.');
    }
  });

  return { open, close, isOpen: () => !root.hidden, refreshFavorite: () => channel && renderFavorite() };
}

function fullscreenElement() {
  return document.fullscreenElement ?? document.webkitFullscreenElement ?? null;
}

function describeHlsError(data) {
  if (data.type === 'networkError') {
    return 'La señal está fuera del aire o bloquea la reproducción en el navegador (CORS). Puede que funcione en la app del TV box.';
  }
  if (data.type === 'mediaError') return 'La señal usa un formato que el navegador no puede decodificar.';
  return GENERIC_CAUSE;
}
