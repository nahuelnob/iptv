// Full-screen player overlay. Prefers hls.js (loaded as a global from index.html) wherever
// Media Source Extensions exist, and falls back to native HLS (iOS Safari, some TV webviews).
// Native support alone is not enough: recent Chrome answers "maybe" to canPlayType for HLS
// but reports errors with far less detail than hls.js.
// YouTube channels play through the official embed in an iframe instead.
import { isBack } from './keys.js';
import { focusElement } from './spatial-nav.js';
import { parseYouTubeUrl, youtubeEmbedUrl } from '../domain/youtube.js';
import { KNOWN_YOUTUBE_CHANNELS } from '../data/youtube-channels.js';
import { devProxyAvailable, devProxyUrl } from '../infra/dev-proxy.js';

export function createPlayer(root) {
  const video = root.querySelector('video');
  const embed = root.querySelector('[data-player-embed]');
  const title = root.querySelector('[data-player-title]');
  const meta = root.querySelector('[data-player-meta]');
  const status = root.querySelector('[data-player-status]');
  const closeButton = root.querySelector('[data-player-close]');
  let hls = null;
  let current = null; // the playback attempt in progress; late errors from older ones are ignored
  let returnFocusTo = null;

  closeButton.addEventListener('click', close);
  root.addEventListener('keydown', (event) => {
    if (isBack(event)) {
      event.preventDefault();
      close();
    }
  });
  // On Android TV browsers (and Capacitor's WebView) the remote's Back key never reaches the page
  // as a key: it navigates history. Opening the player pushes a history entry, so Back pops it.
  window.addEventListener('popstate', () => {
    if (!root.hidden) hide();
  });
  video.addEventListener('playing', () => setStatus(null));
  video.addEventListener('waiting', () => setStatus('Buffering…'));

  function open(channel) {
    returnFocusTo = document.activeElement;
    title.textContent = channel.name;
    meta.textContent = [channel.quality, channel.groups.join(' / ')].filter(Boolean).join(' · ');
    root.hidden = false;
    if (!history.state?.player) history.pushState({ player: true }, '');
    focusElement(closeButton);
    if (parseYouTubeUrl(channel.url)) playYouTube(channel.url);
    else play(channel.url);
  }

  function playYouTube(url) {
    teardown();
    const src = youtubeEmbedUrl(url, KNOWN_YOUTUBE_CHANNELS);
    if (!src) {
      return fail('This YouTube channel is listed by name and its channel ID is unknown. Add it to src/data/youtube-channels.js.');
    }
    video.hidden = true;
    embed.hidden = false;
    embed.src = src;
    // The embed reports nothing back without the IFrame API, so explain the likely causes up front.
    setStatus('If YouTube shows an error, the channel is not live right now or does not allow embedding.');
    setTimeout(() => { if (embed.src === src) setStatus(null); }, 6000);
  }

  function play(url, { viaProxy = false } = {}) {
    teardown();
    const attempt = { url, viaProxy };
    current = attempt;
    setStatus(viaProxy ? 'Blocked by the browser. Retrying through the local dev proxy…' : 'Connecting…');

    if (!viaProxy && location.protocol === 'https:' && url.startsWith('http:')) {
      return retryOrFail(attempt, 'This channel streams over plain HTTP, which browsers block on HTTPS pages.');
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

    video.play().catch(() => { /* autoplay may need a gesture; the controls stay available */ });
  }

  async function retryOrFail(attempt, message) {
    if (!attempt.viaProxy && await devProxyAvailable() && current === attempt) {
      return play(attempt.url, { viaProxy: true });
    }
    if (current === attempt) fail(attempt.viaProxy ? 'The channel did not answer, even through the dev proxy. It is probably offline.' : message);
  }

  // Closing from the UI (button, Esc) goes through history too, so no stale entry is left behind.
  function close() {
    if (root.hidden) return;
    if (history.state?.player) history.back();
    else hide();
  }

  function hide() {
    teardown();
    root.hidden = true;
    if (returnFocusTo?.isConnected) focusElement(returnFocusTo);
  }

  function teardown() {
    current = null;
    hls?.destroy();
    hls = null;
    video.removeAttribute('src');
    video.load();
    video.hidden = false;
    embed.hidden = true;
    embed.removeAttribute('src');
  }

  function fail(message) {
    teardown();
    setStatus(message, true);
  }

  function setStatus(message, isError = false) {
    status.hidden = !message;
    status.textContent = message ?? '';
    status.classList.toggle('player__status--error', isError);
  }

  video.addEventListener('error', () => {
    // Native playback reports no cause, so a CORS block looks like any other failure: try the proxy.
    if (!hls && video.error && current) {
      retryOrFail(current, 'This stream format is not supported by the browser, or the channel is offline.');
    }
  });

  return { open, close };
}

function describeHlsError(data) {
  if (data.type === 'networkError') {
    return 'The channel is offline or blocks browser playback (CORS). It may still work on a TV box app.';
  }
  if (data.type === 'mediaError') return 'The stream uses a format the browser cannot decode.';
  return 'Playback failed for this channel.';
}
