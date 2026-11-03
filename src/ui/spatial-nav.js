// Geometric focus navigation for D-pads: arrow keys move focus to the nearest
// [data-nav] element in that direction, so mouse, keyboard and TV remote share one UI.
import { directionOf } from './keys.js';

const SELECTOR = '[data-nav]:not([disabled])';

export function enableSpatialNav(root = document) {
  root.addEventListener('keydown', (event) => {
    const direction = directionOf(event);
    if (!direction || event.defaultPrevented) return;

    const current = document.activeElement;
    // Inside a text field, left/right move the caret; only up/down leave the field.
    if (isTextField(current) && (direction === 'left' || direction === 'right')) return;

    const scope = current?.closest('[data-nav-scope]') ?? document;
    const target = current?.matches?.(SELECTOR)
      ? nearest(current, direction, scope)
      : scope.querySelector(SELECTOR);

    if (target) {
      event.preventDefault();
      focusElement(target);
    }
  });
}

export function focusElement(element) {
  element.focus({ preventScroll: true });
  element.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

function nearest(from, direction, scope) {
  const origin = from.getBoundingClientRect();
  let best = null;
  let bestScore = Infinity;

  for (const candidate of scope.querySelectorAll(SELECTOR)) {
    if (candidate === from || !isVisible(candidate)) continue;
    const rect = candidate.getBoundingClientRect();
    const { primary, secondary } = distances(origin, rect, direction);
    if (primary <= 0) continue;
    // Off-axis distance weighs more, so focus prefers staying in the same row or column.
    const score = primary + secondary * 3;
    if (score < bestScore) {
      bestScore = score;
      best = candidate;
    }
  }
  return best;
}

function distances(a, b, direction) {
  const ac = center(a);
  const bc = center(b);
  switch (direction) {
    case 'right': return { primary: b.left - a.right + 1, secondary: Math.abs(bc.y - ac.y) };
    case 'left': return { primary: a.left - b.right + 1, secondary: Math.abs(bc.y - ac.y) };
    case 'down': return { primary: b.top - a.bottom + 1, secondary: Math.abs(bc.x - ac.x) };
    case 'up': return { primary: a.top - b.bottom + 1, secondary: Math.abs(bc.x - ac.x) };
  }
}

function center(rect) {
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

function isVisible(element) {
  return element.offsetParent !== null || element.getClientRects().length > 0;
}

function isTextField(element) {
  return element instanceof HTMLInputElement && ['text', 'url', 'search'].includes(element.type);
}
