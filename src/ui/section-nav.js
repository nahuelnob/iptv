// Presentational: side rail, breadcrumb and the drawer (sections + categories), header variant 2.
// The rail is not focusable; the drawer is a focus scope opened with ◀ from the first tile column.
import { focusElement, isVisible } from './spatial-nav.js';

export const SECTION_LABELS = { home: 'Inicio', search: 'Buscar', favorites: 'Favoritos', playlist: 'Lista' };
export const ALL = 'all';

export function categoryLabel(category) {
  return category === ALL ? 'Todos los canales' : category;
}

export function createSectionNav(doc = document) {
  const drawer = doc.querySelector('[data-drawer]');
  const scrim = doc.querySelector('[data-scrim]');
  const list = drawer.querySelector('[data-cats]');
  const cueStart = drawer.querySelector('[data-cue-start]');
  const cueEnd = drawer.querySelector('[data-cue-end]');
  let onClose = () => {};

  list.addEventListener('scroll', updateEdges, { passive: true });
  // focusin fires inside focus(), before the scrollIntoView that follows; recount after that scroll.
  list.addEventListener('focusin', () => queueMicrotask(updateEdges));
  window.addEventListener('resize', () => { if (isOpen()) updateEdges(); });
  // Heights change when the web font arrives.
  doc.fonts?.ready.then(() => { if (isOpen()) updateEdges(); });
  scrim.addEventListener('click', () => close(true));

  // categories: [{ name, count }] in groupChannels() order; total: number of channels.
  function render({ section, category, categories, total }) {
    for (const item of doc.querySelectorAll('.rail__item[data-go]')) {
      item.setAttribute('aria-current', String(item.dataset.go === section));
    }
    doc.querySelector('.rail__item[data-open-cats]')
      .setAttribute('aria-current', String(section === 'home' && category !== ALL));
    for (const item of drawer.querySelectorAll('.drawer__nav [data-go]')) {
      const active = item.dataset.go === section;
      item.setAttribute('aria-current', String(active));
      item.toggleAttribute('data-entry', active && section !== 'home');
    }

    const entries = categories.length ? [{ name: ALL, count: total }, ...categories] : [];
    list.replaceChildren(...entries.map(({ name, count }) => {
      const active = section === 'home' && name === category;
      const li = doc.createElement('li');
      const button = doc.createElement('button');
      button.type = 'button';
      button.className = 'drawer__item';
      button.dataset.nav = '';
      button.dataset.cat = name;
      button.setAttribute('aria-current', String(active));
      button.toggleAttribute('data-entry', active);
      const small = doc.createElement('small');
      small.textContent = String(count);
      button.append(categoryLabel(name), small);
      li.append(button);
      return li;
    }));
    drawer.querySelector('[data-cats-total]').textContent = categories.length ? String(categories.length) : '';

    doc.querySelector('[data-crumb-section]').textContent = SECTION_LABELS[section];
    doc.querySelector('[data-crumb-sep]').hidden = section !== 'home';
    doc.querySelector('[data-crumb-cat]').textContent = section === 'home' ? categoryLabel(category) : '';
  }

  function isOpen() {
    return !drawer.hidden;
  }

  // Opens on the current item: the active section, or the active category on Inicio.
  function open() {
    drawer.hidden = false;
    scrim.hidden = false;
    const entry = drawer.querySelector('[data-entry]');
    focusElement(isVisible(entry) ? entry : drawer.querySelector('[data-nav]'));
    updateEdges();
  }

  function close(restore = true) {
    if (!isOpen()) return;
    drawer.hidden = true;
    scrim.hidden = true;
    if (restore) onClose();
  }

  // Edge cues: how many categories are (partly) hidden above and below.
  function updateEdges() {
    const box = list.getBoundingClientRect();
    let before = 0;
    let after = 0;
    for (const item of list.querySelectorAll('.drawer__item')) {
      const rect = item.getBoundingClientRect();
      if (rect.top < box.top - 1) before += 1;
      else if (rect.bottom > box.bottom + 1) after += 1;
    }
    cueStart.textContent = `▲ ${before} más`;
    cueEnd.textContent = `▼ ${after} más`;
    cueStart.hidden = before === 0;
    cueEnd.hidden = after === 0;
    list.toggleAttribute('data-more-start', before > 0);
    list.toggleAttribute('data-more-end', after > 0);
  }

  return {
    render,
    open,
    close,
    isOpen,
    contains: (element) => drawer.contains(element),
    // Where focus goes when the drawer closes itself (▶, Back, scrim click).
    set onClose(callback) { onClose = callback; },
  };
}
