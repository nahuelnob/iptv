// Geometric focus navigation for D-pads: arrow keys move focus to the nearest
// [data-nav] element in that direction, so mouse, keyboard and TV remote share one UI.
//
// Scopes: inside a [data-nav-scope] (player, drawer) focus never leaves that element.
// Zones: moving into another [data-zone] (header, content) lands on that zone's last focused
// element, or its [data-entry], instead of whatever is geometrically nearest.
// Edges: when nothing lies in that direction, onEdge(from, direction) may act (open the drawer).
import { directionOf } from './keys.js';

const SELECTOR = '[data-nav]:not([disabled])';
const lastInZone = new WeakMap();

export function enableSpatialNav({ root = document, onEdge } = {}) {
  root.addEventListener('focusin', (event) => {
    const zone = event.target.closest?.('[data-zone]');
    if (zone && event.target.matches(SELECTOR)) lastInZone.set(zone, event.target);
  });

  root.addEventListener('keydown', (event) => {
    const direction = directionOf(event);
    if (!direction || event.defaultPrevented) return;

    const current = document.activeElement;
    // Inside a text field, left/right move the caret; only up/down leave the field.
    if (isTextField(current) && (direction === 'left' || direction === 'right')) return;

    const fromNav = current?.matches?.(SELECTOR);
    const scope = current?.closest('[data-nav-scope]') ?? document;
    let target = fromNav ? nearest(current, direction, scope) : firstVisible(scope);
    if (target && fromNav) target = zoneEntry(current, target);

    if (target) {
      event.preventDefault();
      focusElement(target);
    } else if (fromNav && onEdge?.(current, direction)) {
      event.preventDefault();
    }
  });
}

export function focusElement(element) {
  element.focus({ preventScroll: true });
  element.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

export function isVisible(element) {
  return Boolean(element?.isConnected) && (element.offsetParent !== null || element.getClientRects().length > 0);
}

function zoneEntry(from, next) {
  const fromZone = from.closest('[data-zone]');
  const nextZone = next.closest('[data-zone]');
  if (!nextZone || fromZone === nextZone) return next;
  const last = lastInZone.get(nextZone);
  if (last && nextZone.contains(last) && isVisible(last)) return last;
  const entry = nextZone.querySelector('[data-entry]');
  return isVisible(entry) ? entry : next;
}

function firstVisible(scope) {
  return [...scope.querySelectorAll(SELECTOR)].find(isVisible) ?? null;
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

function isTextField(element) {
  return element instanceof HTMLInputElement && ['text', 'url', 'search'].includes(element.type);
}
