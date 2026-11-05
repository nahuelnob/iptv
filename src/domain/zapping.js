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
  return windowAround(list, current, 2 * radius + 1);
}

// The channel column: `size` channels (as many as fit on screen) around the current one, which sits
// in the middle; with an even size the extra channel goes below.
export function windowAround(list, current, size) {
  const index = list.indexOf(current);
  if (index === -1) return [current];
  const span = Math.max(1, Math.min(list.length, size));
  const before = Math.floor((span - 1) / 2);
  return Array.from({ length: span }, (_, i) => list[(index - before + i + list.length) % list.length]);
}
