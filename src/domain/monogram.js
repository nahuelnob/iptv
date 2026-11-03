// Channel monograms: the default tile visual, since many playlist logos are missing or broken.
// The rule (design/PLAN.md section 4) keeps short brands whole so DeporTV, C5N and LN+ stay recognizable.

export function monogram(name) {
  const compact = name.replace(/\s/g, '');
  if (!compact) return '?';
  if (compact.length <= 4) return compact.toUpperCase();

  const words = name.split(/[^\p{L}\p{N}+]+/u).filter(Boolean);
  if (!words.length) return '?';
  if (words.length === 1) {
    const capitals = words[0].match(/[\p{Lu}\p{N}]/gu) || [];
    return (capitals.length >= 2 ? capitals.join('').slice(0, 3) : words[0].slice(0, 2)).toUpperCase();
  }
  // A leading acronym ("TN Todo Noticias") is the brand people know.
  if (/^[\p{Lu}\p{N}]{2,3}$/u.test(words[0])) return words[0];
  return words.slice(0, 2).map((word) => (/^\p{N}+$/u.test(word) ? word : word[0])).join('').toUpperCase();
}
