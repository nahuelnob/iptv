// Channel logos come from public lists, often as Wikimedia thumbnails far larger than a tile (up to
// 960 px, some originals 3840 px). Decoding those is slow on a TV box, so ask for the size on screen.
// Wikimedia serves only standard thumbnail widths (120, 250, 330, 500, 960…): callers pass one of
// them. Other hosts keep their address: imgur's small versions are JPEG and would lose transparency.

const WIKIMEDIA_THUMB = /^(https:\/\/upload\.wikimedia\.org\/.+\/thumb\/.+\/)(\d+)px-([^/]+)$/;

export function logoUrl(url, width) {
  const match = WIKIMEDIA_THUMB.exec(url ?? '');
  if (!match) return url;

  const [, folder, current, file] = match;
  if (Number(current) <= width) return url;

  return `${folder}${width}px-${file}`;
}
