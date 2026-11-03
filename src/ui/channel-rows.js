// Presentational: renders category rows of channel cards. Knows nothing about loading or playback.
import { parseYouTubeUrl } from '../domain/youtube.js';

export function renderRows(container, rows, { onSelect }) {
  container.replaceChildren(...rows.map((row, index) => renderRow(row, index, onSelect)));
}

function renderRow(row, index, onSelect) {
  const section = document.createElement('section');
  section.className = 'row';
  const headingId = `row-${index}`;
  section.setAttribute('aria-labelledby', headingId);

  const heading = document.createElement('h2');
  heading.className = 'row__title';
  heading.id = headingId;
  heading.innerHTML = `<span></span><span class="row__count"></span>`;
  heading.firstChild.textContent = row.name;
  heading.lastChild.textContent = String(row.channels.length).padStart(2, '0');

  const list = document.createElement('ul');
  list.className = 'row__list';
  list.append(...row.channels.map((channel) => renderCard(channel, onSelect)));

  section.append(heading, list);
  return section;
}

function renderCard(channel, onSelect) {
  const item = document.createElement('li');
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'card';
  button.dataset.nav = '';
  button.dataset.channelId = channel.id;

  const art = document.createElement('span');
  art.className = 'card__art';
  art.append(renderMonogram(channel.name));
  if (channel.logo) art.append(renderLogo(channel.logo));

  const name = document.createElement('span');
  name.className = 'card__name';
  name.textContent = channel.name;

  const meta = document.createElement('span');
  meta.className = 'card__meta';
  meta.textContent = [
    channel.quality,
    parseYouTubeUrl(channel.url) ? 'youtube' : null,
    channel.geoBlocked ? 'region-locked' : null,
    channel.unstable ? 'part-time' : null,
  ].filter(Boolean).join(' · ');

  button.append(art, name, meta);
  button.addEventListener('click', () => onSelect(channel));
  item.append(button);
  return item;
}

function renderLogo(src) {
  const img = document.createElement('img');
  img.className = 'card__logo';
  img.src = src;
  img.alt = '';
  img.loading = 'lazy';
  img.decoding = 'async';
  img.referrerPolicy = 'no-referrer';
  // Broken logos are common in public lists: fall back to the monogram underneath.
  img.addEventListener('error', () => img.remove(), { once: true });
  return img;
}

function renderMonogram(name) {
  const mono = document.createElement('span');
  mono.className = 'card__monogram';
  mono.setAttribute('aria-hidden', 'true');
  mono.textContent = name.replace(/[^\p{L}\p{N} ]/gu, '').split(/\s+/).filter(Boolean)
    .slice(0, 2).map((word) => word[0]).join('').toUpperCase() || '?';
  return mono;
}
