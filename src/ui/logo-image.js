// Channel logos for the grid and the player's channel column. Two costs matter on a TV box:
// - Chrome 66 ignores loading="lazy", so a 200-channel list downloaded and decoded every logo at
//   once. Here a logo starts loading only when it gets near the screen (IntersectionObserver).
// - Lists point at huge images; logoUrl() asks for the size on screen where the host allows it.
// Broken logos are common in public lists: the caller keeps its monogram until onShow() runs, and a
// logo that fails to load or decode is removed.
import { logoUrl } from '../domain/logo-url.js';

// Start loading a little before the logo scrolls into view.
const MARGIN = '300px';
// Removed tiles that never came into view stay observed; sweep them once this many are watched.
const SWEEP_AT = 400;

let observer;
const watched = new Set();
// Logos already decoded once: the browser holds them, so they show at once instead of waiting for
// the observer and decode() again. Without this the player column flashed its letters on every ▲ ▼.
const painted = new Set();

export function logoImage(src, { className, width, onShow }) {
  const img = document.createElement('img');
  img.className = className;
  img.alt = '';
  img.decoding = 'async';
  img.referrerPolicy = 'no-referrer';

  const url = logoUrl(src, width);

  img.addEventListener('error', () => {
    painted.delete(url);
    img.remove();
  }, { once: true });

  if (painted.has(url)) {
    img.src = url;
    onShow();
    return img;
  }

  // "load" fires before a huge logo is decoded; showing it then left blank tiles.
  img.addEventListener('load', () => {
    const decoded = typeof img.decode === 'function' ? img.decode() : Promise.resolve();
    decoded.then(() => {
      painted.add(url);
      onShow();
    }, () => img.remove());
  }, { once: true });

  const lazy = lazyObserver();

  if (lazy) {
    img.dataset.src = url;
    watch(lazy, img);
  } else {
    img.src = url;
  }

  return img;
}

function lazyObserver() {
  if (observer !== undefined) return observer;

  observer = typeof IntersectionObserver === 'function'
    ? new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const img = entry.target;
        observer.unobserve(img);
        watched.delete(img);
        img.src = img.dataset.src;
      }
    }, { rootMargin: MARGIN })
    : null;

  return observer;
}

function watch(lazy, img) {
  if (watched.size >= SWEEP_AT) {
    for (const old of watched) {
      if (old.isConnected) continue;
      lazy.unobserve(old);
      watched.delete(old);
    }
  }

  watched.add(img);
  lazy.observe(img);
}
