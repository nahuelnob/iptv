// Channel search by name, ignoring case and accents ("television publica" finds "Televisión Pública").
// Pure: returns where the match sits in the original name so the UI can underline it.

export function searchChannels(channels, query) {
  const needle = fold(query).text.trim();
  if (!needle) return [];
  const hits = [];
  for (const channel of channels) {
    const match = locate(channel.name, needle);
    if (match) hits.push({ channel, match });
  }
  return hits;
}

export function matchName(name, query) {
  const needle = fold(query).text.trim();
  return needle ? locate(name, needle) : null;
}

function locate(name, needle) {
  const { text, starts, ends } = fold(name);
  const at = text.indexOf(needle);
  if (at === -1) return null;
  return { start: starts[at], end: ends[at + needle.length - 1] };
}

// Folds to lowercase without diacritics and collapses whitespace runs, remembering for every folded
// character which original characters produced it (NFD splits "ó" into "o" + a combining accent).
function fold(original) {
  let text = '';
  const starts = [];
  const ends = [];
  let index = 0;
  for (const char of original) {
    const next = index + char.length;
    const base = /\s/u.test(char) ? ' ' : char.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
    if (base === ' ' && text.endsWith(' ')) ends[ends.length - 1] = next;
    else {
      for (const unit of base) {
        text += unit;
        starts.push(index);
        ends.push(next);
      }
    }
    index = next;
  }
  return { text, starts, ends };
}
