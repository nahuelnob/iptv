// The viewer's library: favorites and the last watched channel. Pure, no DOM, no storage.
// Everything is keyed by stream URL: channel ids are positions in the list (ch-0, ch-1…)
// and change whenever the playlist changes.

export function emptyLibrary() {
  return { favorites: [], lastWatched: null };
}

// Storage is shared with older versions and can be edited by hand: keep only well-formed parts.
export function parseLibrary(raw) {
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    return emptyLibrary();
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return emptyLibrary();
  const favorites = Array.isArray(data.favorites) ? data.favorites.filter((url) => typeof url === 'string') : [];
  const last = data.lastWatched;
  const lastWatched = last && typeof last.url === 'string' && Number.isFinite(last.at)
    ? { url: last.url, at: last.at }
    : null;
  return { favorites: [...new Set(favorites)], lastWatched };
}

export function isFavorite(library, url) {
  return library.favorites.includes(url);
}

// Favorites keep the order in which they were added.
export function toggleFavorite(library, url) {
  const favorites = isFavorite(library, url)
    ? library.favorites.filter((saved) => saved !== url)
    : [...library.favorites, url];
  return { ...library, favorites };
}

export function markWatched(library, url, at) {
  return { ...library, lastWatched: { url, at } };
}

// Favorites that exist in the loaded list, in saved order. Others stay saved for when that list returns.
export function favoriteChannels(library, channels) {
  const byUrl = indexByUrl(channels);
  return library.favorites.map((url) => byUrl.get(url)).filter(Boolean);
}

export function lastWatchedChannel(library, channels) {
  if (!library.lastWatched) return null;
  return indexByUrl(channels).get(library.lastWatched.url) ?? null;
}

// The same stream can appear twice in a list; the first entry wins.
function indexByUrl(channels) {
  const byUrl = new Map();
  for (const channel of channels) if (!byUrl.has(channel.url)) byUrl.set(channel.url, channel);
  return byUrl;
}
