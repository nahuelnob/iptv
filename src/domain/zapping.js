// Channel switching while watching: ▲ ▼ move through the list the viewer opened the channel from
// (a category, favorites, search results or every channel). The list is circular.

// step: -1 for the channel above, +1 for the one below.
export function neighborChannel(list, current, step) {
  if (!list.length) return current;
  const index = list.indexOf(current);
  if (index === -1) return list[0];
  return list[(index + step + list.length) % list.length];
}

// The strip: up to `radius` channels on each side of the current one. Short lists show each channel
// once instead of wrapping into repeats; the extra slot of an even count goes below.
export function neighborWindow(list, current, radius = 2) {
  const index = list.indexOf(current);
  if (index === -1) return [current];
  const span = Math.min(list.length, 2 * radius + 1);
  const before = Math.floor((span - 1) / 2);
  return Array.from({ length: span }, (_, i) => list[(index - before + i + list.length) % list.length]);
}
