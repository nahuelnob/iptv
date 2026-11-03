// Presentational: channel tiles for the mosaic grid. Knows nothing about loading, storage or playback.
// Tiles carry data-index (position in the loaded list) so the container can map them back to channels.
import { monogram } from '../domain/monogram.js';
import { parseYouTubeUrl } from '../domain/youtube.js';

const QUALITY_LABELS = { sd: 'SD' };

export function renderTile(channel, { index, favorite = false, match = null }) {
  const item = document.createElement('li');
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'tile';
  button.dataset.nav = '';
  button.dataset.index = String(index);
  button.dataset.shade = String(shadeOf(channel.name));
  button.setAttribute('aria-label', channel.name);

  const mono = span('tile__mono', monogram(channel.name));
  mono.setAttribute('aria-hidden', 'true');
  const name = span('tile__name');
  name.setAttribute('aria-hidden', 'true');
  appendHighlighted(name, channel.name, match);

  if (favorite) button.append(favoriteMark());
  button.append(mono);
  if (channel.logo) button.append(renderLogo(channel.logo, button));
  button.append(name);
  item.append(button);
  return item;
}

// "Seguir viendo": double width, text instead of a monogram.
export function renderContinueTile(channel, { index }) {
  const item = document.createElement('li');
  item.className = 'grid__wide';
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'tile tile--wide';
  button.dataset.nav = '';
  button.dataset.index = String(index);
  button.dataset.continue = '';
  const text = document.createElement('span');
  text.append(span('tile__kicker', 'Seguir viendo'), span('tile__big', channel.name));
  button.append(text);
  item.append(button);
  return item;
}

export function renderSkeletons(count) {
  return Array.from({ length: count }, () => {
    const item = document.createElement('li');
    item.className = 'skel';
    item.setAttribute('aria-hidden', 'true');
    return item;
  });
}

export function setFavoriteMark(button, favorite) {
  const mark = button.querySelector('.tile__fav');
  if (favorite && !mark) button.prepend(favoriteMark());
  if (!favorite) mark?.remove();
}

// "1080p · Noticias · YouTube · Solo Argentina": warnings go last, in bold (never colour alone).
export function renderChannelMeta(target, channel, category) {
  const group = channel.groups.includes(category) ? category : channel.groups[0];
  const plain = [qualityLabel(channel.quality), group, parseYouTubeUrl(channel.url) ? 'YouTube' : null]
    .filter(Boolean).join(' · ');
  const notes = [channel.geoBlocked ? 'Solo Argentina' : null, channel.unstable ? 'Horario parcial' : null]
    .filter(Boolean).join(', ');
  target.textContent = plain;
  if (notes) {
    const bold = document.createElement('b');
    bold.textContent = notes;
    target.append(plain ? ' · ' : '', bold);
  }
}

export function qualityLabel(quality) {
  return quality ? QUALITY_LABELS[quality] ?? quality : null;
}

// Stable shade from the name: tiles differ by lightness only, so the accent stays the only hue.
function shadeOf(name) {
  return [...name].reduce((hash, ch) => (hash * 31 + ch.codePointAt(0)) >>> 0, 7) % 3;
}

function renderLogo(src, tile) {
  const img = document.createElement('img');
  img.className = 'tile__logo';
  img.src = src;
  img.alt = '';
  img.loading = 'lazy';
  img.decoding = 'async';
  img.referrerPolicy = 'no-referrer';
  // Broken logos are common in public lists: the monogram stays until a logo can really paint.
  // "load" fires before a huge logo (some are 3840px wide) is decoded; swapping then left blank tiles.
  img.addEventListener('load', () => {
    const decoded = typeof img.decode === 'function' ? img.decode() : Promise.resolve();
    decoded.then(() => tile.classList.add('tile--logo'), () => img.remove());
  }, { once: true });
  img.addEventListener('error', () => img.remove(), { once: true });
  return img;
}

function appendHighlighted(target, text, match) {
  if (!match) {
    target.textContent = text;
    return;
  }
  const mark = document.createElement('mark');
  mark.textContent = text.slice(match.start, match.end);
  target.append(text.slice(0, match.start), mark, text.slice(match.end));
}

function favoriteMark() {
  return span('tile__fav', 'Favorito');
}

function span(className, text = '') {
  const el = document.createElement('span');
  el.className = className;
  el.textContent = text;
  return el;
}
