import { isBack, browseStepOf, channelStepOf, directionOf } from './keys.js';
import { focusElement } from './spatial-nav.js';
import { qualityLabel } from './tiles.js';
import { monogram } from '../domain/monogram.js';
import { logoImage } from './logo-image.js';
import { neighborChannel, windowAround } from '../domain/zapping.js';
import { startSession, markPlaying, nextReconnect } from '../domain/reconnect.js';
import { pickDisplayMode } from '../domain/display-mode.js';
import { parseYouTubeUrl, youtubeEmbedUrl } from '../domain/youtube.js';
import { KNOWN_YOUTUBE_CHANNELS } from '../data/youtube-channels.js';
import { devProxyAvailable, devProxyUrl } from '../infra/dev-proxy.js';
import { nativeVideo } from '../infra/native-video.js';
import { loadHls } from '../infra/hls-loader.js';
import { savedSurface, saveSurface } from '../infra/video-surface-store.js';
import { nextSurface } from '../domain/diagnostics.js';
import { createDiagnosticsPanel } from './diagnostics-panel.js';

const ZAP_DELAY_MS = 400;
// Rows of the channel column: as many as fit (measured after the first render), three on phones,
// where the column is a bottom sheet with no height of its own.
const FIRST_ROWS = 7;
const PHONE_ROWS = 3;
const PHONE = '(max-width: 720px)';
const SWITCH_HINT = 'Elegí otro canal con ▲ ▼ y OK.';
const IDLE_MS = 4000;
// Loading shows as a small corner indicator, and only when it lasts: short buffers go unseen.
const LOADING_DELAY_MS = 700;
// Reconnect tries before this one stay quiet (indicator only); from it on, a message says so.
const LOUD_RECONNECT_ATTEMPT = 3;
const CLOSE_FALLBACK_MS = 600;
const GENERIC_CAUSE = 'La señal no responde o el navegador no la admite.';
const NO_PICTURE =
  'Se escucha el audio pero no hay imagen: este canal envía el video en un formato que el navegador no puede mostrar (por ejemplo MPEG-2). Probá otra señal del mismo canal o elegí otro con ▲ ▼ y OK.';

const CLOUDFLARE_PROXY =
  'https://proxy.nahue-santini.workers.dev/?url=';

export function createPlayer(root, {
  isFavorite = () => false,
  onToggleFavorite = () => false,
  onWatch = () => {},
  onClose = () => {},
  numberOf = () => '',
  // Developer options: the diagnostics panel shows only while they are on.
  isDevMode = () => false,
} = {}) {

  const video = root.querySelector('video');
  let embed = root.querySelector('[data-player-embed]');
  const number = root.querySelector('[data-player-no]');
  const title = root.querySelector('[data-player-name]');
  const meta = root.querySelector('[data-player-meta]');
  const notice = root.querySelector('[data-player-notice]');
  const status = root.querySelector('[data-player-status]');
  const loading = root.querySelector('[data-player-loading]');
  const stripList = root.querySelector('[data-strip-list]');
  const stripPos = root.querySelector('[data-strip-pos]');
  const favoriteButton = root.querySelector('[data-player-fav]');
  const unmuteButton = root.querySelector('[data-player-unmute]');
  const closeButton = root.querySelector('[data-player-close]');

  let hls = null;
  let current = null;
  let returnFocusTo = null;
  let channel = null;
  // The channel the column's cursor is on; it is `channel` until ▲ ▼ move it.
  let cursor = null;
  let columnRows = FIRST_ROWS;
  let opened = null;
  let list = [];
  let zapTimer = null;
  let idleTimer = null;
  let closing = false;
  let closeFallback = null;
  let fullscreenOwned = false;
  let focusAfterClose = null;
  let reenterFullscreen = false;

  // Reconnection of the channel on screen: at most one wait pending, cleared by teardown().
  let session = startSession();
  let reconnectTimer = null;
  let retryWhenVisible = null;

  // Android app only: null in a browser.
  const native = nativeVideo();
  let nativeSeq = 0;
  // ExoPlayer holds a stream (playing, or failed and waiting to reconnect with its last frame shown).
  let nativeActive = false;

  // Browsers play HLS with hls.js: start fetching it now. The Android app never needs it.
  let hlsUnavailable = false;
  if (!native) loadHls();

  const diag = createDiagnosticsPanel(root, {
    onSwitchSurface: switchSurface,
    readStats: native && typeof native.stats === 'function' ? () => native.stats() : null,
  });

  if (native) {
    // Events carry the id given to play(): late events from a channel already left are ignored.
    const on = (event, handler) => native.addListener(event, data => {
      if (current?.native && current.id === data?.id) handler(data, current);
    });

    for (const name of ['buffering', 'playing', 'firstFrame', 'tracks', 'decoder', 'format', 'dropped', 'error', 'stall', 'loadError', 'rejoin', 'frameRate']) {
      on(name, data => diag.event(name, data));
    }

    on('buffering', () => {
      setLoading(true);
    });

    // Frame-rate matching: once the plugin has measured the channel's real frame rate, ask the
    // screen for a refresh that is a whole multiple of it (src/domain/display-mode.js decides).
    on('frameRate', data => {
      native.displayModes()
        .then(info => {
          const modeId = pickDisplayMode(data.fps, info.modes, info.current);
          if (modeId !== null) return native.setDisplayMode({ modeId });
        })
        .catch(() => {});
    });

    on('playing', (_data, attempt) => {
      session = markPlaying(session, Date.now());
      setLoading(false);
      setStatus(attempt.noPicture ? NO_PICTURE : null);
    });

    on('tracks', (data, attempt) => {
      attempt.noPicture = !data.video;
      if (attempt.noPicture) setStatus(NO_PICTURE);
    });

    on('error', (data, attempt) => {
      recover(attempt, describeHttpStatus(data.status) ?? GENERIC_CAUSE);
    });
  }

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

  root.addEventListener('keydown', event => {
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

    const browse = browseStepOf(event);

    if (browse) {
      event.preventDefault();
      wake();
      moveCursor(neighborChannel(list, cursor, browse));
      return;
    }

    const idle = root.hasAttribute('data-idle');

    wake();

    if (idle && !directionOf(event)) {
      event.preventDefault();
    }
  });

  root.addEventListener('pointermove', wake);

  // A rotated phone or a resized window changes how many rows fit.
  window.addEventListener('resize', () => {
    if (!root.hidden && cursor) renderColumn();
  });

  window.addEventListener('popstate', () => {
    if (!root.hidden) hide();
  });

  for (const type of [
    'fullscreenchange',
    'webkitfullscreenchange'
  ]) {
    document.addEventListener(type, () => {
      if (fullscreenElement() === root) {
        fullscreenOwned = true;
        refocusIfLost(closeButton);

      } else if (reenterFullscreen) {
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

  function refocusIfLost(element) {
    for (const delay of [50, 400]) {
      setTimeout(() => {
        const lost =
          !document.activeElement ||
          document.activeElement === document.body;

        if (lost && element?.isConnected) {
          focusElement(element);
        }
      }, delay);
    }
  }

  // An audio-only attempt keeps its notice instead of the usual loading/playing statuses.
  video.addEventListener('playing', () => {
    if (current) diag.event('playing');
    if (current) session = markPlaying(session, Date.now());
    setLoading(false);
    setStatus(current?.noPicture ? NO_PICTURE : null);
  });

  // A wait that ended while the app was in the background resumes when it comes back.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden || !retryWhenVisible) return;

    const retry = retryWhenVisible;
    retryWhenVisible = null;
    retry();
  });

  video.addEventListener('waiting', () => {
    if (current) setLoading(true);
  });

  function open(selected, browsingList = [selected]) {
    returnFocusTo = document.activeElement;
    opened = selected;
    list = browsingList.includes(selected)
      ? browsingList
      : [selected];

    closing = false;
    root.hidden = false;

    enterFullscreen();

    if (!history.state?.player) {
      history.pushState({ player: true }, '');
    }

    show(selected);
    focusCursor();
    wake();
    diag.setVisible(isDevMode());
    start(selected);
  }

  // CH+ / CH-: straight to the next channel, waiting a moment in case the key is pressed again.
  function zap(step) {
    switchTo(neighborChannel(list, channel, step), ZAP_DELAY_MS);
  }

  function switchTo(next, delay) {
    if (next === channel) return;

    teardown();
    show(next);

    setStatus(null);
    setLoading(true);

    clearTimeout(zapTimer);

    zapTimer = setTimeout(() => {
      start(next);
    }, delay);
  }

  // OK on a row: switch to that channel; on the channel already on screen, just hide the controls.
  function pick(target) {
    if (target === channel) {
      rest();
      return;
    }

    switchTo(target, 0);
  }

  function moveCursor(target) {
    cursor = target;
    renderColumn();
    focusCursor();
  }

  function focusCursor() {
    const row = stripList.querySelector('[data-cursor]');
    if (row) focusElement(row);
  }

  // The column: the cursor in the middle and as many channels around it as fit. Rendering replaces
  // the rows, so a focus that was inside moves to the new cursor row instead of being lost.
  function renderColumn() {
    const hadFocus = stripList.contains(document.activeElement);

    renderRows();

    // The rows' height depends on the font size (TV or desktop) and the column's on the screen:
    // measure the rendered rows and render again once if a different count fits.
    const fit = rowsThatFit();
    if (fit !== columnRows) {
      columnRows = fit;
      renderRows();
    }

    const index = list.indexOf(cursor);
    stripPos.textContent = index === -1 ? '' : `${index + 1} de ${list.length}`;

    if (hadFocus) focusCursor();
  }

  function rowsThatFit() {
    if (window.matchMedia?.(PHONE).matches) return PHONE_ROWS;

    const items = stripList.children;
    const style = getComputedStyle(stripList);
    const space = stripList.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);

    if (!items.length || space <= 0) return columnRows;

    const row = items[0].offsetHeight;
    // Step from one row to the next: the row plus the gap (or the margin old WebViews use instead).
    const step = items.length > 1 ? items[1].offsetTop - items[0].offsetTop : row;

    if (row <= 0 || step <= 0) return columnRows;

    return Math.max(1, Math.floor((space + step - row) / step));
  }

  function renderRows() {
    stripList.replaceChildren(
      ...windowAround(list, cursor, columnRows).map(neighbor => {
        const playing = neighbor === channel;
        const item = document.createElement('li');
        const row = document.createElement('button');

        row.type = 'button';
        row.className = 'mini';
        row.setAttribute('data-nav', '');
        row.setAttribute('aria-current', String(playing));
        if (neighbor === cursor) row.setAttribute('data-cursor', '');

        const no = document.createElement('span');
        no.className = 'mini__no';
        no.textContent = numberOf(neighbor);

        // The channel's logo in the monogram's box once it can paint; the letters stay otherwise.
        const mono = document.createElement('b');
        mono.className = 'mini__mono';
        const letters = document.createElement('span');
        letters.className = 'mini__letters';
        letters.textContent = monogram(neighbor.name);
        mono.append(letters);

        if (neighbor.logo) {
          mono.append(logoImage(neighbor.logo, {
            className: 'mini__logo',
            width: 120,
            onShow: () => mono.classList.add('mini__mono--logo'),
          }));
        }

        const text = document.createElement('span');
        text.className = 'mini__text';

        const name = document.createElement('span');
        name.className = 'mini__name';
        name.textContent = neighbor.name;

        const sub = document.createElement('span');
        sub.className = 'mini__sub';
        // Always a line, empty or not, so every row has the same height and the count that fits holds.
        sub.textContent = [playing ? 'Viendo ahora' : null, qualityLabel(neighbor.quality)]
          .filter(Boolean)
          .join(' · ') || ' ';

        text.append(name, sub);
        row.append(no, mono, text);

        if (playing) {
          const dot = document.createElement('span');
          dot.className = 'mini__dot';
          row.append(dot);
        } else if (neighbor === cursor) {
          const ok = document.createElement('kbd');
          ok.className = 'mini__ok';
          ok.textContent = 'OK';
          row.append(ok);
        }

        row.addEventListener('click', () => pick(neighbor));

        item.append(row);
        return item;
      })
    );
  }

  function start(target) {
    if (target !== channel || root.hidden) return;

    onWatch(target);
    session = startSession();

    if (parseYouTubeUrl(target.url)) {
      playYouTube(target.url);
    } else if (native) {
      playNative(target.url);
    } else {
      play(target.url);
    }
  }

  // keepPicture: reconnecting the same channel, so ExoPlayer is not stopped and its last frame stays.
  function playNative(url, { keepPicture = false } = {}) {
    teardown({ keepNative: keepPicture });
    nativeActive = true;

    const attempt = {
      url,
      native: true,
      id: ++nativeSeq,
      noPicture: false
    };

    current = attempt;

    document.documentElement.setAttribute('data-native-video', '');
    video.hidden = true;

    setLoading(true);

    // The surface chosen for this device in the diagnostics panel (TextureView unless changed).
    const surface = savedSurface();
    diag.start({ native: true, surface });

    native.play({ url, id: attempt.id, surface }).catch(() => {
      if (current === attempt) fail(GENERIC_CAUSE);
    });
  }

  // Diagnostics panel: try the other surface and restart the channel on it. The choice stays on
  // this device, with the developer options on or off.
  function switchSurface() {
    saveSurface(nextSurface(savedSurface()));
    if (native && channel) playNative(channel.url);
  }

  function show(target) {
    channel = target;

    number.textContent = numberOf(target);
    title.textContent = target.name;
    meta.textContent = qualityLabel(target.quality) ?? '';
    meta.hidden = !target.quality;

    renderFavorite();

    cursor = target;
    renderColumn();

    const warnings = [
      target.geoBlocked
        ? 'Solo Argentina: esta señal se puede ver únicamente desde Argentina.'
        : null,

      target.unstable
        ? 'Horario parcial: puede que este canal no esté transmitiendo ahora.'
        : null,
    ].filter(Boolean);

    notice.hidden = !warnings.length;

    notice.textContent = warnings.length
      ? `${warnings.join(' ')} ${SWITCH_HINT}`
      : '';
  }

  function renderFavorite() {
    const favorite = isFavorite(channel);

    favoriteButton.setAttribute(
      'aria-pressed',
      String(favorite)
    );

    favoriteButton.setAttribute(
      'aria-label',
      favorite
        ? 'Quitar de favoritos'
        : 'Agregar a favoritos'
    );
  }

  function playYouTube(url) {
    teardown();
    // The embed never fires the video's "playing", so nothing else would clear the ring.
    setLoading(false);

    const src = youtubeEmbedUrl(
      url,
      KNOWN_YOUTUBE_CHANNELS
    );

    if (!src) {
      return fail(
        'Este canal de YouTube figura por nombre y no se conoce su ID: hay que agregarlo en src/data/youtube-channels.js.'
      );
    }

    video.hidden = true;

    replaceEmbed(src);

    setStatus(
      'Si YouTube muestra un error, el canal no está transmitiendo ahora o no permite verse fuera de YouTube.'
    );

    setTimeout(() => {
      if (embed.src === src) setStatus(null);
    }, 6000);
  }

  // --------------------------------------------------
  // REPRODUCCIÓN PRINCIPAL
  // --------------------------------------------------

  function play(url, { viaProxy = false } = {}) {
    teardown();
    diag.start({ native: false });

    // Siempre conservar la dirección original.
    let originUrl = url;
    let alreadyProxied = false;

    try {
      const parsed = new URL(url);
      const proxyOrigin = new URL(CLOUDFLARE_PROXY).origin;

      if (parsed.origin === proxyOrigin) {
        const original = parsed.searchParams.get('url');

        if (original) {
          originUrl = original;
          alreadyProxied = true;
        }
      }
    } catch {}

    // Construir una única URL de destino.
    let src;

    if (viaProxy) {
      // Fallback local: recibe la URL original.
      src = devProxyUrl(originUrl);

    } else if (alreadyProxied) {
      // No volver a envolver Cloudflare.
      src = url;

    } else if (
      originUrl.startsWith('http://') ||
      originUrl.startsWith('https://')
    ) {
      // Proxy Cloudflare.
      src = CLOUDFLARE_PROXY +
        encodeURIComponent(originUrl);

    } else {
      src = originUrl;
    }

    const attempt = {
      url: originUrl,
      src,
      viaProxy,
      recovered: false,
      noPicture: false
    };

    current = attempt;

    setLoading(true);

    // Detectar HLS usando la URL original.
    let isHls = false;

    try {
      isHls = /\.m3u8$/i.test(
        new URL(originUrl).pathname
      );
    } catch {
      isHls = /\.m3u8(?:[?#]|$)/i.test(originUrl);
    }

    // hls.js loads on demand (src/infra/hls-loader.js): wait for it once, then play again.
    if (isHls && !window.Hls && !hlsUnavailable) {
      loadHls().then(found => {
        if (!found) hlsUnavailable = true;
        if (current === attempt) play(url, { viaProxy });
      });
      return;
    }

    const Hls = window.Hls;

    if (isHls && Hls?.isSupported()) {
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (!data.fatal || current !== attempt) return;

        if (data.type === 'networkError') {
          retryOrFail(
            attempt,
            describeHlsError(data)
          );

        } else if (
          data.type === 'mediaError' &&
          !attempt.recovered
        ) {
          // Un intento de recuperación antes de rendirse.
          attempt.recovered = true;
          hls.recoverMediaError();

        } else {
          recover(attempt, describeHlsError(data));
        }
      });

      // Some broadcast feeds carry MPEG-2 video, which browsers cannot decode: hls.js drops
      // that track and plays only the audio over a black screen, without raising an error.
      hls.on(Hls.Events.BUFFER_CODECS, (_event, data) => {
        if (current !== attempt) return;

        attempt.noPicture = !data.video && !data.audiovideo;

        if (attempt.noPicture) setStatus(NO_PICTURE);
      });

      hls.loadSource(src);
      hls.attachMedia(video);

    } else {
      video.src = src;
    }

    autoplay(attempt);
  }

  // --------------------------------------------------
  // AUTOPLAY
  // --------------------------------------------------

  function autoplay(attempt) {
    video.play().catch(error => {
      if (
        error?.name !== 'NotAllowedError' ||
        current !== attempt
      ) {
        return;
      }

      video.muted = true;
      unmuteButton.hidden = false;

      video.play().catch(() => {});
    });
  }

  // --------------------------------------------------
  // FALLBACK
  // --------------------------------------------------

  async function retryOrFail(attempt, cause) {
    if (current !== attempt) return;

    if (!attempt.viaProxy) {
      let available = false;

      try {
        available = await devProxyAvailable();
      } catch {}

      // Puede haber cambiado de canal mientras esperábamos.
      if (current !== attempt) return;

      if (available) {
        return play(attempt.url, {
          viaProxy: true
        });
      }
    }

    recover(
      attempt,
      attempt.viaProxy
        ? `Falló también el proxy local. ${cause}`
        : cause
    );
  }

  // --------------------------------------------------
  // RECONEXIÓN
  // --------------------------------------------------

  // Starts the channel over, as switching channels and back does. The failed stream is stopped
  // before the wait, so nothing keeps loading; zapping or closing clears the wait (teardown).
  function recover(attempt, cause) {
    if (current !== attempt) return;

    const next = nextReconnect(session, Date.now());
    session = next.session;

    if (next.delay === null) {
      fail(cause);
      return;
    }

    const target = channel;
    // In the Android app the failed stream keeps its last frame on screen during the wait.
    const again = attempt.native
      ? () => playNative(attempt.url, { keepPicture: true })
      : () => play(attempt.url, { viaProxy: attempt.viaProxy });

    const retry = () => {
      if (target !== channel || root.hidden) return;
      again();
    };

    teardown({ keepNative: attempt.native });

    // The first tries go unnoticed, like a short buffer: only the corner indicator. A cut that
    // lasts gets a message, which brings the controls back.
    setLoading(true);

    if (next.attempt >= LOUD_RECONNECT_ATTEMPT) {
      setStatus(`Se cortó la señal de ${target.name}. Reconectando… (${next.attempt} de ${next.limit})`);
    }

    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;

      if (document.hidden) {
        retryWhenVisible = retry;
      } else {
        retry();
      }
    }, next.delay);
  }

  // --------------------------------------------------
  // CIERRE
  // --------------------------------------------------

  function close() {
    if (root.hidden || closing) return;

    closing = true;

    if (history.state?.player) {
      history.back();

      closeFallback = setTimeout(() => {
        if (!root.hidden) hide();
      }, CLOSE_FALLBACK_MS);

    } else {
      hide();
    }
  }

  function hide() {
    clearTimeout(closeFallback);
    clearTimeout(zapTimer);
    clearTimeout(idleTimer);

    teardown();
    setLoading(false);
    setStatus(null);

    root.hidden = true;
    closing = false;

    fullscreenOwned = false;
    reenterFullscreen = false;

    exitFullscreen();

    if (returnFocusTo?.isConnected) {
      focusElement(returnFocusTo);
    }

    const intended = onClose(opened);

    focusAfterClose =
      intended ??
      (returnFocusTo?.isConnected ? returnFocusTo : null);
  }

  // --------------------------------------------------
  // LIMPIEZA
  // --------------------------------------------------

  // keepNative: a reconnect of the same channel keeps ExoPlayer and its last frame; anything else
  // (another channel, closing, a final error) stops it, even while a reconnect waits.
  function teardown({ keepNative = false } = {}) {
    if (nativeActive && !keepNative) {
      native.stop().catch(() => {});
      document.documentElement.removeAttribute('data-native-video');
      nativeActive = false;
    }

    current = null;

    clearTimeout(reconnectTimer);
    reconnectTimer = null;
    retryWhenVisible = null;

    hls?.destroy();
    hls = null;

    video.removeAttribute('src');
    video.load();

    video.hidden = false;

    replaceEmbed(null);
  }

  function replaceEmbed(src) {
    const next = embed.cloneNode(false);

    next.removeAttribute('src');

    if (src) next.src = src;

    next.hidden = !src;

    embed.replaceWith(next);
    embed = next;
  }

  // --------------------------------------------------
  // ERRORES
  // --------------------------------------------------

  function fail(cause) {
    teardown();
    setLoading(false);

    setStatus(
      `No se pudo reproducir ${channel.name}. ${cause} ${SWITCH_HINT}`,
      true
    );
  }

  function setStatus(message, isError = false) {
    status.hidden = !message;
    status.textContent = message ?? '';

    status.classList.toggle(
      'player__status--error',
      isError
    );

    // A message to read brings the controls back. Clearing one does not, but if the controls are up
    // the idle countdown starts again: rest() skipped hiding them while the message was there.
    if (message) wake();
    else if (!root.hasAttribute('data-idle')) armIdle();
  }

  // Loading never wakes the controls nor keeps them up: a corner indicator, shown only when the
  // wait lasts LOADING_DELAY_MS.
  let loadingTimer = null;

  function setLoading(on) {
    clearTimeout(loadingTimer);
    loadingTimer = null;

    if (!on) {
      loading.hidden = true;
      return;
    }

    if (!loading.hidden) return;

    loadingTimer = setTimeout(() => {
      loadingTimer = null;
      if (!root.hidden) loading.hidden = false;
    }, LOADING_DELAY_MS);
  }

  function describeHlsError(data) {
    if (data.type === 'networkError') {
      return describeHttpStatus(data.response?.code) ??
        'La señal no responde o el servidor no permite la reproducción desde el navegador.';
    }

    if (data.type === 'mediaError') {
      return 'La señal usa un formato que el navegador no puede decodificar.';
    }

    return GENERIC_CAUSE;
  }

  function describeHttpStatus(status) {
    if (status === 403) {
      return 'El servidor rechazó el pedido (403): la señal está restringida a ciertas conexiones o regiones.';
    }

    if (status >= 400) {
      return `El servidor respondió con el error ${status}.`;
    }

    return null;
  }

  // --------------------------------------------------
  // CONTROLES E INACTIVIDAD
  // --------------------------------------------------

  function wake() {
    root.removeAttribute('data-idle');
    armIdle();
  }

  function armIdle() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(rest, IDLE_MS);
  }

  // Hides the controls over the video, unless a status needs reading. A cursor left on another
  // channel goes back to the one on screen, so the column opens on it next time.
  function rest() {
    if (!status.hidden || root.hidden) return;

    root.setAttribute('data-idle', '');

    if (cursor !== channel) {
      cursor = channel;
      renderColumn();
    }
  }

  // --------------------------------------------------
  // FULLSCREEN
  // --------------------------------------------------

  function enterFullscreen() {
    // The Android app already fills the screen, and element fullscreen there opens a native
    // "custom view": old TV WebViews (Chrome 66) crash their renderer on it, leaving a blank page
    // over the native video while the audio goes on, and newer ones cover the video with it.
    if (native) return;

    const request =
      root.requestFullscreen ??
      root.webkitRequestFullscreen;

    if (!request) return;

    if (fullscreenElement()) {
      reenterFullscreen = true;
      return;
    }

    try {
      request.call(root)?.catch?.(() => {});
    } catch {}
  }

  function exitFullscreen() {
    if (fullscreenElement() !== root) return;

    const exit =
      document.exitFullscreen ??
      document.webkitExitFullscreen;

    try {
      exit?.call(document)?.catch?.(() => {});
    } catch {}
  }

  // --------------------------------------------------
  // ERRORES DEL VIDEO NATIVO
  // --------------------------------------------------

  video.addEventListener('error', () => {
    // El chequeo de "src" evita falsos errores que algunos navegadores
    // disparan cuando teardown() hace load() sin fuente.
    if (
      !hls &&
      video.error &&
      current &&
      video.getAttribute('src')
    ) {
      retryOrFail(
        current,
        'El navegador no admite el formato de esta señal, o el canal no está disponible.'
      );
    }
  });

  return {
    open,
    close,
    isOpen: () => !root.hidden,
    refreshFavorite: () => channel && renderFavorite()
  };
}

function fullscreenElement() {
  return (
    document.fullscreenElement ??
    document.webkitFullscreenElement ??
    null
  );
}