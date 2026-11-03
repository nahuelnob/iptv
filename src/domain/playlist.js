// Pure M3U parsing and grouping. No DOM, no network: runs the same in Node tests and in the browser.

export const OTHER_GROUP = 'Otros';

// Public lists (iptv-org, Free-TV) name categories in English; the app is for Argentina.
// Unknown names are shown as they come.
const GROUP_NAMES_ES = {
  animation: 'Animación',
  auto: 'Autos',
  business: 'Negocios',
  classic: 'Clásicos',
  comedy: 'Humor',
  cooking: 'Cocina',
  culture: 'Cultura',
  documentary: 'Documentales',
  education: 'Educación',
  entertainment: 'Entretenimiento',
  family: 'Familia',
  general: 'General',
  kids: 'Infantiles',
  legislative: 'Legislativo',
  lifestyle: 'Estilo de vida',
  movies: 'Cine',
  music: 'Música',
  news: 'Noticias',
  outdoor: 'Aire libre',
  relax: 'Relax',
  religious: 'Religión',
  science: 'Ciencia',
  series: 'Series',
  shop: 'Compras',
  sports: 'Deportes',
  travel: 'Viajes',
  weather: 'Clima',
};

export function parseM3U(text) {
  const channels = [];
  let pending = null;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line.startsWith('#EXTINF:')) {
      // A new EXTINF before a URL means the previous entry had no stream: drop it.
      pending = parseExtinf(line.slice('#EXTINF:'.length));
      continue;
    }
    if (line.startsWith('#')) continue;

    if (pending) {
      channels.push({ id: `ch-${channels.length}`, ...pending, url: line });
      pending = null;
    }
  }

  return channels;
}

export function groupChannels(channels) {
  const byGroup = new Map();
  for (const channel of channels) {
    for (const group of channel.groups) {
      if (!byGroup.has(group)) byGroup.set(group, []);
      byGroup.get(group).push(channel);
    }
  }

  return [...byGroup]
    .map(([name, members]) => ({ name, channels: members }))
    .sort((a, b) => {
      if (a.name === OTHER_GROUP) return 1;
      if (b.name === OTHER_GROUP) return -1;
      return b.channels.length - a.channels.length;
    });
}

function parseExtinf(body) {
  const nameStart = indexOfUnquotedComma(body);
  const header = nameStart === -1 ? body : body.slice(0, nameStart);
  const rawName = nameStart === -1 ? '' : body.slice(nameStart + 1).trim();
  const attrs = parseAttributes(header);
  const { name, quality, unstable, geoBlocked } = splitNameTags(rawName || attrs['tvg-name'] || 'Unnamed channel');

  return {
    name,
    quality,
    unstable,
    geoBlocked,
    logo: attrs['tvg-logo'] || null,
    tvgId: attrs['tvg-id'] || null,
    groups: parseGroups(attrs['group-title']),
  };
}

function indexOfUnquotedComma(text) {
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '"') inQuotes = !inQuotes;
    else if (text[i] === ',' && !inQuotes) return i;
  }
  return -1;
}

function parseAttributes(header) {
  const attrs = {};
  for (const [, key, value] of header.matchAll(/([\w-]+)="([^"]*)"/g)) {
    attrs[key.toLowerCase()] = value.trim();
  }
  return attrs;
}

function parseGroups(groupTitle) {
  const groups = (groupTitle || '')
    .split(';')
    .map((g) => g.trim())
    .filter((g) => g && g.toLowerCase() !== 'undefined')
    .map((g) => GROUP_NAMES_ES[g.toLowerCase()] ?? g);
  // Two source names can translate to the same one ("Movies;Cine").
  const unique = [...new Set(groups)];
  return unique.length ? unique : [OTHER_GROUP];
}

// Lists carry metadata inside names.
// iptv-org: "A24 (1080p) [Not 24/7]".
// Free-TV: Ⓨ YouTube (detected from the URL instead), Ⓖ geo-blocked, Ⓢ not HD.
function splitNameTags(rawName) {
  let name = rawName;
  const geoBlocked = name.includes('Ⓖ');
  const sd = name.includes('Ⓢ');
  name = name.replace(/\s*[ⓎⒼⓈ]/gu, '');

  const unstable = /\[not 24\/7\]/i.test(name);
  name = name.replace(/\s*\[not 24\/7\]/i, '');

  const qualityMatch = name.match(/\s*\((\d{3,4}p)\)\s*$/i);
  const quality = qualityMatch ? qualityMatch[1].toLowerCase() : (sd ? 'sd' : null);
  if (qualityMatch) name = name.slice(0, qualityMatch.index);

  return { name: name.trim(), quality, unstable, geoBlocked };
}
