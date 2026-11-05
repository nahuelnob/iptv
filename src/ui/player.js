import { isBack, channelStepOf, directionOf } from './keys.js';
import { focusElement } from './spatial-nav.js';
import { qualityLabel } from './tiles.js';
import { monogram } from '../domain/monogram.js';
import { neighborChannel, neighborWindow } from '../domain/zapping.js';
import { startSession, markPlaying, nextReconnect } from '../domain/reconnect.js';
import { parseYouTubeUrl, youtubeEmbedUrl } from '../domain/youtube.js';
import { KNOWN_YOUTUBE_CHANNELS } from '../data/youtube-channels.js';
import { devProxyAvailable, devProxyUrl } from '../infra/dev-proxy.js';
import { nativeVideo } from '../infra/native-video.js';

const ZAP_DELAY_MS = 400;
const IDLE_MS = 4000;
const CLOSE_FALLBACK_MS = 600;
const GENERIC_CAUSE = 'La señal no responde o el navegador no la admite.';
const NO_PICTURE =
  'Se escucha el audio pero no hay imagen: este canal envía el video en un formato que el navegador no puede mostrar (por ejemplo MPEG-2). Probá otra señal del mismo canal o presioná ▼ para pasar al siguiente.';

const CLOUDFLARE_PROXY =
  'https://proxy.nahue-santini.workers.dev/?url=';

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
  let current = null;
  let returnFocusTo = null;
  let channel = null;
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

  if (native) {
    // Events carry the id given to play(): late events from a channel already left are ignored.
    const on = (event, handler) => native.addListener(event, data => {
      if (current?.native && current.id === data?.id) handler(data, current);
    });

    on('buffering', (_data, attempt) => {
      setStatus(attempt.noPicture ? NO_PICTURE : 'Cargando…');
    });

    on('playing', (_data, attempt) => {
      session = markPlaying(session, Date.now());
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

    const idle = root.hasAttribute('data-idle');

    wake();

    if (idle && !directionOf(event)) {
      event.preventDefault();
    }
  });

  root.addEventListener('pointermove', wake);

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
    if (current) session = markPlaying(session, Date.now());
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
    setStatus(current?.noPicture ? NO_PICTURE : 'Cargando…');
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

    zapTimer = setTimeout(() => {
      start(next);
    }, ZAP_DELAY_MS);
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

  function playNative(url) {
    teardown();

    const attempt = {
      url,
      native: true,
      id: ++nativeSeq,
      noPicture: false
    };

    current = attempt;

    document.documentElement.setAttribute('data-native-video', '');
    video.hidden = true;

    setStatus(`Conectando con ${channel.name}…`);

    native.play({ url, id: attempt.id }).catch(() => {
      if (current === attempt) fail(GENERIC_CAUSE);
    });
  }

  function show(target) {
    channel = target;

    number.textContent = numberOf(target);
    title.textContent = target.name;
    meta.textContent = qualityLabel(target.quality) ?? '';
    meta.hidden = !target.quality;

    renderFavorite();

    stripList.replaceChildren(
      ...neighborWindow(list, target).map(neighbor => {
        const item = document.createElement('li');

        item.className = 'mini';
        item.setAttribute(
          'aria-current',
          String(neighbor === target)
        );

        const mono = document.createElement('b');
        mono.textContent = monogram(neighbor.name);

        const name = document.createElement('span');
        name.textContent = neighbor.name;

        item.append(mono, name);

        return item;
      })
    );

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
      ? `${warnings.join(' ')} Presioná ▼ para pasar al canal siguiente.`
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

    setStatus(
      viaProxy
        ? 'Reintentando mediante el proxy local…'
        : `Conectando con ${channel.name}…`
    );

    // Detectar HLS usando la URL original.
    let isHls = false;

    try {
      isHls = /\.m3u8$/i.test(
        new URL(originUrl).pathname
      );
    } catch {
      isHls = /\.m3u8(?:[?#]|$)/i.test(originUrl);
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
    const again = attempt.native
      ? () => playNative(attempt.url)
      : () => play(attempt.url, { viaProxy: attempt.viaProxy });

    const retry = () => {
      if (target !== channel || root.hidden) return;
      again();
    };

    teardown();

    setStatus(
      next.limit > 1
        ? `Se cortó la señal de ${target.name}. Reconectando… (${next.attempt} de ${next.limit})`
        : `${target.name} no responde. Reintentando…`
    );

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

  function teardown() {
    if (current?.native) {
      native.stop().catch(() => {});
      document.documentElement.removeAttribute('data-native-video');
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

    setStatus(
      `No se pudo reproducir ${channel.name}. ${cause} Presioná ▼ para pasar al canal siguiente.`,
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

    wake();
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

    clearTimeout(idleTimer);

    idleTimer = setTimeout(() => {
      if (status.hidden && !root.hidden) {
        root.setAttribute('data-idle', '');
      }
    }, IDLE_MS);
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