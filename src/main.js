// Container: owns the browse state (section, category, loaded list) and wires playlist loading,
// the mosaic, the section navigation, Back and the player together.
import { parseM3U, groupChannels } from './domain/playlist.js';
import { toggleFavorite, isFavorite, markWatched, favoriteChannels, lastWatchedChannel } from './domain/library.js';
import { searchChannels } from './domain/search.js';
import { loadFromUrl, loadFromFile, playlistName, rememberUrl, lastUrl } from './infra/playlist-source.js';
import { loadLibrary, saveLibrary } from './infra/library-store.js';
import { renderTile, renderContinueTile, renderSkeletons, renderChannelMeta, setFavoriteMark } from './ui/tiles.js';
import { createSectionNav, ALL } from './ui/section-nav.js';
import { createPlayer } from './ui/player.js';
import { createBackGuard } from './ui/back-stack.js';
import { isBack } from './ui/keys.js';
import { enableSpatialNav, focusElement, isVisible } from './ui/spatial-nav.js';
import { connectNativeBack } from './infra/native-back.js';
import { checkForUpdate } from './infra/app-update.js';
import { createUpdatePrompt } from './ui/update-prompt.js';

const $ = (selector) => document.querySelector(selector);
const views = {
  grid: $('[data-view="grid"]'),
  search: $('[data-view="search"]'),
  message: $('[data-view="message"]'),
};
const grid = $('[data-grid]');
const searchInput = $('[data-search-input]');
const results = $('[data-results]');
const resultsLabel = $('[data-results-label]');
const infoName = $('[data-info-name]');
const infoMeta = $('[data-info-meta]');
const messageBox = $('[data-message]');
const fileInput = $('[data-source-file]');
const announcer = $('[data-announce]');
const clock = $('[data-clock]');
const context = $('[data-context]');

const state = {
  channels: [],
  categories: [],      // groupChannels() output
  indexOf: new Map(),  // channel → position in the loaded list (tiles carry it as data-index)
  source: null,        // { name, url? , file? } of the loaded list
  loadedAt: null,
  status: 'empty',     // empty | loading | ready | error
  loading: null,       // source being loaded
  error: null,         // { title, body, source } of the last failed load
  section: 'home',     // home | search | favorites | playlist
  category: ALL,
  query: '',
  visible: [],         // channels of the current grid, in order: the list ▲ ▼ moves through
};
let library = loadLibrary();
let staleBehindPlayer = false; // the library changed while watching: re-render on close
let lastContentFocus = null;
let loadToken = 0;
const HOLD_MS = 600; // OK held this long on a tile toggles the favorite (PLAN section 3)
const UPDATE_CHECK_DELAY_MS = 4000;
let hold = null;

const nav = createSectionNav();
const player = createPlayer($('[data-player]'), {
  isFavorite: (channel) => isFavorite(library, channel.url),
  onToggleFavorite: (channel) => toggleFavoriteOf(channel),
  onWatch,
  onClose: afterPlayer,
  numberOf: (channel) => String(state.indexOf.get(channel) + 1),
});
const updatePrompt = createUpdatePrompt($('[data-update]'), { onChange: () => guard.sync() });
const guard = createBackGuard({
  hasWork: () => Boolean(backAction()),
  onBack: () => backAction()?.(),
  isSuspended: () => player.isOpen(),
});

nav.onClose = focusContent;
enableSpatialNav({ onEdge });
connectNativeBack();

// ---- Rendering --------------------------------------------------------

function render() {
  nav.render({
    section: state.section,
    category: state.category,
    categories: state.categories.map(({ name, channels }) => ({ name, count: channels.length })),
    total: state.channels.length,
  });
  renderContext();
  if (state.section === 'playlist') return showMessage(...sourcePanels());
  if (state.section === 'search') return renderSearch();
  if (state.status === 'loading') return renderLoading();
  if (!state.channels.length) {
    return showMessage(...(state.status === 'error' ? [errorPanel()] : sourcePanels()));
  }
  if (state.section === 'favorites') return renderFavorites();
  renderHome();
}

function renderHome() {
  const group = state.category === ALL ? null : state.categories.find((g) => g.name === state.category);
  const items = group ? group.channels : state.channels;
  const last = state.category === ALL ? lastWatchedChannel(library, state.channels) : null;
  showGrid(items, last ? [renderContinueTile(last, { index: state.indexOf.get(last) })] : []);
}

function renderFavorites() {
  const items = favoriteChannels(library, state.channels);
  if (items.length) return showGrid(items, []);
  showMessage(el('div', { className: 'panel' },
    el('h2', {}, 'Todavía no tenés favoritos'),
    el('p', {}, 'Sirven para tener a mano los canales que más mirás. Abrí cualquier canal y elegí ',
      el('strong', {}, 'Agregar a favoritos'), '.'),
    el('button', { className: 'button button--primary', type: 'button', 'data-nav': '', 'data-cat': ALL }, 'Ver todos los canales'),
  ));
}

function showGrid(items, lead) {
  state.visible = items;
  grid.replaceChildren(...lead, ...items.map((channel) => renderTile(channel, {
    index: state.indexOf.get(channel),
    favorite: isFavorite(library, channel.url),
  })));
  showView('grid');
  const first = grid.querySelector('[data-index]');
  if (first) showInfo(first);
}

// Native field: Android TV opens its system keyboard on it.
function renderSearch() {
  showView('search');
  if (searchInput.value !== state.query) searchInput.value = state.query;
  const query = state.query.trim();
  const hits = searchChannels(state.channels, query);
  state.visible = hits.map(({ channel }) => channel);
  results.replaceChildren(...hits.map(({ channel, match }) => renderTile(channel, {
    index: state.indexOf.get(channel),
    favorite: isFavorite(library, channel.url),
    match,
  })));
  if (!query) resultsLabel.textContent = 'Escribí parte del nombre de un canal. En el televisor se abre el teclado del sistema.';
  else if (hits.length) {
    resultsLabel.textContent = `${hits.length} de ${state.channels.length} canales coinciden con “${query}”. Bajá con ▼ para ver los resultados.`;
  } else {
    resultsLabel.textContent = `Ningún canal coincide con “${query}”. Revisá cómo lo escribiste o probá con otra parte del nombre.`;
  }
}

function clearSearch() {
  state.query = '';
  renderSearch();
  focusElement(searchInput);
}

function renderLoading() {
  showView('grid');
  state.visible = [];
  infoName.textContent = 'Cargando canales…';
  infoMeta.textContent = state.loading?.name ?? '';
  grid.replaceChildren(...renderSkeletons(12));
}

function renderContext() {
  if (state.status === 'loading') context.textContent = `Cargando ${state.loading.name}…`;
  else if (state.channels.length) context.textContent = `${state.source.name} · ${plural(state.channels.length, 'canal', 'canales')}`;
  else context.textContent = '';
}

function showView(name) {
  for (const [key, view] of Object.entries(views)) view.hidden = key !== name;
}

function showMessage(...panels) {
  state.visible = [];
  messageBox.replaceChildren(...panels);
  showView('message');
}

// Lista: where the list comes from. Also the first-use screen when nothing is loaded.
function sourcePanels() {
  const panels = [];
  if (state.error && state.channels.length) panels.push(errorPanel({ actions: false }));

  const loaded = state.channels.length > 0;
  const form = el('form', { className: 'source' },
    el('input', {
      className: 'field', type: 'url', name: 'url', autocomplete: 'url',
      value: state.source?.url ?? lastUrl(), 'aria-label': 'URL de la lista', 'data-nav': '',
    }),
    el('div', { className: 'actions' },
      el('button', { className: 'button button--primary', type: 'submit', 'data-nav': '' }, 'Cargar lista'),
      el('button', { className: 'button', type: 'button', 'data-nav': '', 'data-action': 'open-file' }, 'Abrir archivo'),
      state.source?.url
        ? el('button', { className: 'button', type: 'button', 'data-nav': '', 'data-action': 'reload' }, 'Volver a cargar')
        : null,
    ),
  );
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const url = form.elements.url.value.trim();
    if (url) loadUrl(url);
  });

  panels.push(el('div', { className: 'panel' },
    el('h2', {}, loaded ? 'Lista de canales' : 'Cargá una lista para empezar a mirar'),
    el('p', {}, loaded
      ? `${state.source.name} · ${plural(state.channels.length, 'canal', 'canales')} · ${plural(state.categories.length, 'categoría', 'categorías')} · cargada ${loadedWhen(state.loadedAt)}.`
      : 'Pegá la URL de una lista M3U o abrí un archivo .m3u de este dispositivo. Usá solo listas que tengas derecho a ver: canales públicos, de aire o un servicio que pagues.'),
    form,
  ));
  return panels;
}

function errorPanel({ actions = true } = {}) {
  const { title, body, source } = state.error;
  const saved = lastUrl();
  return el('div', { className: 'panel panel--error', role: 'alert' },
    el('h2', {}, title),
    el('p', {}, body),
    actions ? el('div', { className: 'actions' },
      el('button', { className: 'button button--primary', type: 'button', 'data-nav': '', 'data-action': 'retry' }, 'Reintentar'),
      el('button', { className: 'button', type: 'button', 'data-nav': '', 'data-go': 'playlist' }, 'Cambiar lista'),
      saved && saved !== source.url
        ? el('button', { className: 'button', type: 'button', 'data-nav': '', 'data-action': 'use-saved' }, 'Usar la lista guardada')
        : null,
    ) : null,
  );
}

// Info line: names whatever tile has focus, big, above the grid.
function showInfo(tile) {
  const channel = state.channels[Number(tile.dataset.index)];
  if (!channel) return;
  infoName.textContent = tile.hasAttribute('data-continue') ? `Seguir viendo: ${channel.name}` : channel.name;
  renderChannelMeta(infoMeta, channel, state.category);
}

// ---- Navigation -------------------------------------------------------

function goSection(section) {
  nav.close(false);
  state.section = section;
  render();
  focusDefault();
}

function setCategory(category) {
  nav.close(false);
  state.section = 'home';
  state.category = category;
  render();
  focusDefault();
}

// Lands on the first channel tile (not "Seguir viendo", which is one ◀ away), else the first control.
function focusDefault() {
  if (!views.search.hidden) {
    focusElement(searchInput);
    guard.sync();
    return;
  }
  const view = Object.values(views).find((v) => !v.hidden);
  const target = view?.querySelector('[data-index]:not([data-continue])') ?? view?.querySelector('[data-nav]');
  if (target) focusElement(target);
  // focus() fires no focusin while the page itself is unfocused (at startup): name the tile directly.
  if (target && views.grid.contains(target)) showInfo(target);
  guard.sync();
}

function focusContent() {
  if (isVisible(lastContentFocus)) focusElement(lastContentFocus);
  else focusDefault();
}

// ◀ past the first column opens the drawer; ▶ past the drawer closes it.
function onEdge(from, direction) {
  if (nav.contains(from)) {
    if (direction === 'right') nav.close(true);
    return direction === 'right';
  }
  if (direction === 'left' && from.closest('main')) {
    nav.open();
    guard.sync();
    return true;
  }
  return false;
}

// Back, in order: open drawer → header back to the grid → section back to Inicio → category back to Todos.
function backAction() {
  if (updatePrompt.isOpen()) return updatePrompt.close;
  if (player.isOpen()) return null;
  if (nav.isOpen()) return () => nav.close(true);
  const inHeader = document.activeElement?.closest('[data-zone="top"]');
  const gridSection = state.section === 'home' || state.section === 'favorites';
  if (inHeader && gridSection && !views.grid.hidden && views.grid.querySelector('[data-nav]')) return focusContent;
  if (state.section === 'search' && state.query.trim()) return clearSearch;
  if (state.section !== 'home') return () => goSection('home');
  if (state.category !== ALL) return () => setCategory(ALL);
  return null;
}

// ---- Loading ----------------------------------------------------------

function loadUrl(url) {
  return load(() => loadFromUrl(url), { name: playlistName(url), url });
}

async function load(readText, source) {
  const token = ++loadToken;
  nav.close(false);
  state.status = 'loading';
  state.loading = source;
  state.section = 'home';
  render();
  guard.sync();

  let channels;
  try {
    channels = parseM3U(await readText());
  } catch (error) {
    if (token === loadToken) fail({ title: 'No se pudo cargar la lista', body: withSavedNote(error.message, source), source });
    return;
  }
  if (token !== loadToken) return;
  if (!channels.length) {
    return fail({ title: 'No se encontraron canales', body: 'Revisá que el archivo sea una lista M3U.', source });
  }

  state.channels = channels;
  state.categories = groupChannels(channels);
  state.indexOf = new Map(channels.map((channel, index) => [channel, index]));
  state.source = source;
  state.loadedAt = new Date();
  state.status = 'ready';
  state.loading = null;
  state.error = null;
  if (!state.categories.some((g) => g.name === state.category)) state.category = ALL;
  if (source.url) rememberUrl(source.url);
  announce(channels.length === 1 ? '1 canal cargado.' : `${channels.length} canales cargados.`);
  render();
  focusDefault();
}

// A failed load keeps whatever list was already loaded; the error shows in Lista then.
function fail(error) {
  state.error = error;
  state.loading = null;
  state.status = state.channels.length ? 'ready' : 'error';
  state.section = state.channels.length ? 'playlist' : 'home';
  render();
  focusDefault();
}

// Only true when another list still works: the loaded one, or a saved URL other than the one that failed.
function withSavedNote(message, source) {
  const saved = lastUrl();
  const fallback = state.channels.length > 0 || (saved && saved !== source.url);
  return fallback ? `${message} La última lista que funcionó sigue guardada.` : message;
}

function retry() {
  const { source } = state.error;
  if (source.file) load(() => loadFromFile(source.file), source);
  else loadUrl(source.url);
}

// ---- Library ----------------------------------------------------------

function toggleFavoriteOf(channel) {
  library = toggleFavorite(library, channel.url);
  saveLibrary(library);
  const favorite = isFavorite(library, channel.url);
  announce(`${channel.name}: ${favorite ? 'agregado a favoritos' : 'quitado de favoritos'}.`);
  if (player.isOpen()) {
    staleBehindPlayer = true;
  } else if (state.section === 'favorites') {
    // The list itself changed: keep focus at the same position.
    const tiles = [...grid.querySelectorAll('[data-index]')];
    const position = tiles.indexOf(document.activeElement);
    render();
    const next = [...grid.querySelectorAll('[data-index]')];
    if (next.length) focusElement(next[Math.min(Math.max(position, 0), next.length - 1)]);
    else focusDefault();
  } else {
    for (const tile of document.querySelectorAll('main .tile:not([data-continue])')) {
      if (state.channels[Number(tile.dataset.index)]?.url === channel.url) setFavoriteMark(tile, favorite);
    }
  }
  return favorite;
}

function onWatch(channel) {
  if (library.lastWatched?.url !== channel.url) staleBehindPlayer = true;
  library = markWatched(library, channel.url, Date.now());
  saveLibrary(library);
}

// Back from the player lands on the tile it was opened from (PLAN section 2), re-rendered if
// favorites or "Seguir viendo" changed meanwhile.
// Returns the tile focus should end on, so the player can restore it if the platform drops focus later.
function afterPlayer(opened) {
  let intended = null;
  if (staleBehindPlayer) {
    staleBehindPlayer = false;
    const fromContinue = document.activeElement?.hasAttribute('data-continue');
    render();
    const view = Object.values(views).find((v) => !v.hidden);
    const tiles = [...(view?.querySelectorAll('[data-index]') ?? [])];
    const target = fromContinue
      ? tiles.find((tile) => tile.hasAttribute('data-continue'))
      : tiles.find((tile) => !tile.hasAttribute('data-continue') && state.channels[Number(tile.dataset.index)]?.url === opened.url);
    if (target) focusElement(target);
    else focusDefault();
    intended = target ?? null;
  }
  guard.sync();
  return intended;
}

// ---- Events -----------------------------------------------------------

document.addEventListener('click', (event) => {
  const target = event.target.closest('[data-go],[data-open-cats],[data-cat],[data-index],[data-action]');
  if (!target) return;
  // ▲ ▼ in the player move through the list this tile belongs to.
  if (target.dataset.index) return player.open(state.channels[Number(target.dataset.index)], state.visible);
  if (target.dataset.go) return goSection(target.dataset.go);
  if (target.dataset.cat) return setCategory(target.dataset.cat);
  if (target.hasAttribute('data-open-cats')) {
    nav.open();
    return guard.sync();
  }
  switch (target.dataset.action) {
    case 'open-file': return fileInput.click();
    case 'reload': return loadUrl(state.source.url);
    case 'retry': return retry();
    case 'use-saved': return loadUrl(lastUrl());
  }
});

document.addEventListener('keydown', (event) => {
  if (!isBack(event) || event.defaultPrevented || player.isOpen()) return;
  event.preventDefault();
  guard.back();
});

// On a tile, OK plays on release, so holding it can toggle the favorite instead; F is the keyboard shortcut.
document.addEventListener('keydown', (event) => {
  const tile = event.target.closest?.('main [data-index]');
  if (!tile || player.isOpen() || event.ctrlKey || event.metaKey || event.altKey) return;
  const channel = state.channels[Number(tile.dataset.index)];
  if (event.key === 'f' || event.key === 'F') {
    event.preventDefault();
    toggleFavoriteOf(channel);
    return;
  }
  if (event.key !== 'Enter') return;
  event.preventDefault();
  if (event.repeat || hold) return;
  hold = {
    tile,
    fired: false,
    timer: setTimeout(() => {
      hold.fired = true;
      toggleFavoriteOf(channel);
    }, HOLD_MS),
  };
});

document.addEventListener('keyup', (event) => {
  if (event.key !== 'Enter' || !hold) return;
  const { tile, fired, timer } = hold;
  clearTimeout(timer);
  hold = null;
  if (!fired && document.activeElement === tile) tile.click();
});

document.addEventListener('focusout', () => {
  if (!hold) return;
  clearTimeout(hold.timer);
  hold = null;
});

document.addEventListener('focusin', (event) => {
  if (event.target.closest('main')) lastContentFocus = event.target;
  const tile = event.target.closest('[data-index]');
  if (tile && views.grid.contains(tile)) showInfo(tile);
  guard.sync();
});

searchInput.addEventListener('input', () => {
  state.query = searchInput.value;
  renderSearch();
  guard.sync();
});

fileInput.addEventListener('change', () => {
  const [file] = fileInput.files;
  if (file) load(() => loadFromFile(file), { name: file.name, file });
  fileInput.value = '';
});

// ---- Status bar -------------------------------------------------------

function tick() {
  clock.textContent = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function loadedWhen(date) {
  const time = date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });
  if (date.toDateString() === new Date().toDateString()) return `hoy a las ${time}`;
  return `el ${date.toLocaleDateString('es-AR', { day: 'numeric', month: 'numeric' })} a las ${time}`;
}

function plural(count, one, many) {
  return `${count} ${count === 1 ? one : many}`;
}

function announce(message) {
  announcer.textContent = message;
}

function el(tag, props, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (key in node && !key.includes('-')) node[key] = value;
    else node.setAttribute(key, value);
  }
  node.append(...children.filter((child) => child != null));
  return node;
}

// ---- Start ------------------------------------------------------------

tick();
setInterval(tick, 15000);
const saved = lastUrl();
// Open on the last list that worked, so a channel is one move and OK away (PLAN section 1).
if (saved) loadUrl(saved);
else {
  render();
  focusDefault();
}

// Android app: offer a newer APK once the list is up. Never interrupts a channel being watched.
setTimeout(async () => {
  const update = await checkForUpdate();
  if (update && !player.isOpen()) updatePrompt.open(update);
}, UPDATE_CHECK_DELAY_MS);
