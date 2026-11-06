// Video diagnostics in the player, shown only with the developer options on: app and Android
// version, decoder, format, first-frame time and dropped frames, plus the surface switch.
// The player feeds it events; this module only keeps and renders them.
import { androidVersionOf, describeFormat, describeDropped, describeCushion, describeCount, SURFACES } from '../domain/diagnostics.js';

// How often the panel asks the native player for its buffer while it is on screen.
const STATS_MS = 1000;

// readStats: the Android app's NativeVideo.stats() (buffer ahead, live offset); null in a browser.
export function createDiagnosticsPanel(root, { onSwitchSurface = () => {}, readStats = null } = {}) {
  const panel = root.querySelector('[data-diag]');
  const rows = root.querySelector('[data-diag-list]');
  const switchButton = root.querySelector('[data-diag-surface]');

  let appVersion = '—';
  let state = blank();
  let statsTimer = null;

  appVersionOf().then((version) => {
    appVersion = version;
    render();
  });

  switchButton.addEventListener('click', () => onSwitchSurface());

  function blank() {
    return {
      native: false, surface: 'texture', startedAt: 0, decoder: '—', format: null, firstFrameMs: null, dropped: 0, last: '—',
      cushion: null, stalls: 0, retries: 0, lastRetryStatus: null, rejoins: 0,
    };
  }

  // A channel starts: everything measured so far belongs to the previous one.
  function start({ native, surface }) {
    state = { ...blank(), native, surface, startedAt: Date.now() };
    render();
  }

  function event(name, data = {}) {
    const elapsed = state.startedAt ? `${((Date.now() - state.startedAt) / 1000).toFixed(1)} s` : '';
    if (name === 'decoder') state.decoder = data.decoder || '—';
    if (name === 'format') state.format = data;
    if (name === 'dropped') state.dropped += data.count || 0;
    if (name === 'firstFrame' && state.firstFrameMs === null) state.firstFrameMs = Date.now() - state.startedAt;
    if (name === 'stall') state.stalls += 1;
    if (name === 'rejoin') state.rejoins += 1;
    if (name === 'loadError') {
      state.retries += 1;
      if (data.status) state.lastRetryStatus = data.status;
    }
    state.last = `${name}${data.status ? ` ${data.status}` : ''}${data.message ? ` ${data.message}` : ''} · ${elapsed}`;
    render();
  }

  function setVisible(visible) {
    panel.hidden = !visible;
    clearInterval(statsTimer);
    statsTimer = visible && readStats ? setInterval(pollStats, STATS_MS) : null;
    if (visible) render();
  }

  function pollStats() {
    if (!state.native || root.hidden || panel.hidden) return;
    readStats().then((stats) => {
      state.cushion = stats;
      render();
    }, () => {});
  }

  function render() {
    if (panel.hidden) return;
    const android = androidVersionOf(navigator.userAgent);
    const entries = [
      ['App', appVersion],
      ['Android', android ?? 'no es Android'],
      ['Reproductor', state.native ? 'nativo (ExoPlayer)' : 'web (hls.js)'],
      ['Superficie', state.native ? SURFACES[state.surface] : '—'],
      ['Decodificador', state.decoder],
      ['Formato', describeFormat(state.format)],
      ['Primer cuadro', state.firstFrameMs === null ? 'todavía no' : `${(state.firstFrameMs / 1000).toFixed(1)} s`],
      ['Cuadros perdidos', describeDropped(state.dropped)],
      ['Colchón', state.native ? describeCushion(state.cushion) : '—'],
      ['Trabas', describeCount(state.stalls)],
      ['Reintentos', describeCount(state.retries, state.lastRetryStatus)],
      ['Reconexiones', describeCount(state.rejoins)],
      ['Último evento', state.last],
    ];
    rows.replaceChildren(...entries.flatMap(([term, value]) => {
      const dt = document.createElement('dt');
      dt.textContent = term;
      const dd = document.createElement('dd');
      dd.textContent = value;
      return [dt, dd];
    }));
    switchButton.hidden = !state.native;
    switchButton.textContent = `Probar con ${SURFACES[state.surface === 'surface' ? 'texture' : 'surface']}`;
  }

  return { start, event, setVisible };
}

// The installed app's version in the Android app (Capacitor's App plugin); "web" in a browser.
async function appVersionOf() {
  const app = window.Capacitor?.isNativePlatform?.() ? window.Capacitor.Plugins?.App : null;
  if (!app) return 'web';
  try {
    const { version, build } = await app.getInfo();
    return `${version} (${build})`;
  } catch {
    return '—';
  }
}
