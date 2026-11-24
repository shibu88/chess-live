// Short tournament names for the home graph (home-timeline only).
//
// Broadcast names are long and formal, e.g.
//   "FIDE World Junior Chess Championship 2026 | Open"
//   "Bihar State Senior FIDE Rating Chess Championship 2026"
// so the Gantt labels used to clip with "…". These helpers produce a compact
// label while the full name stays in the bar's tooltip and the Past/Now/Upcoming
// cards. Pure string functions — no DOM, no side effects.

// Generic words dropped (from the end first) only when a name is still too wide
// after the basic clean-up. Distinctive words (place names, "World", "Junior",
// "State", "Senior", …) are kept.
const FILLER = new Set([
  'championship', 'championships', 'tournament', 'open', 'rating', 'chess',
  'festival', 'cup', 'masters', 'classic', 'memorial', 'international',
  'national', 'grand', 'prix', 'round', 'series', 'league',
]);

/**
 * Clean a broadcast name down to its distinctive part:
 * drop the "| Section" suffix, a trailing year, and the "FIDE" token.
 * @param {string} full
 * @returns {string}
 */
export function shortTourName(full) {
  const name = (full || '').toString();
  // 1. Keep only the part before the first "|" (drops "| Open", "| Women", …).
  let s = name.split('|')[0];
  // 2. Remove a 4-digit year (2000–2099), wherever it sits.
  s = s.replace(/\b20\d{2}\b/g, ' ');
  // 3. Remove a standalone "FIDE" token.
  s = s.replace(/\bFIDE\b/gi, ' ');
  // 4. Collapse whitespace and stray separators.
  s = s.replace(/\s{2,}/g, ' ').replace(/\s*[-–—]\s*$/, '').trim();
  return s || name.split('|')[0].trim() || name.trim();
}

/**
 * Trim a (already short-cleaned) label to fit `maxPx`. A label that already fits
 * is returned untouched (so "Norway Chess" stays whole). When it's too wide, all
 * trailing generic filler words are dropped first (e.g. "Bihar State Senior
 * Rating Chess Championship" → "Bihar State Senior"); if it's still too wide,
 * further words are cut from the end to the word boundary — never below
 * `minWords`. `widthOf` maps a string to its rendered pixel width.
 * @param {string} label
 * @param {number} maxPx
 * @param {(text: string) => number} widthOf
 * @param {number} [minWords=2]
 * @returns {string}
 */
export function fitLabel(label, maxPx, widthOf, minWords = 2) {
  if (widthOf(label) <= maxPx) return label;
  const words = label.split(' ').filter(Boolean);
  // Over-width: strip every trailing filler word (not just enough to fit).
  while (
    words.length > minWords &&
    FILLER.has(words[words.length - 1].toLowerCase())
  ) {
    words.pop();
  }
  // Still too wide (distinctive words): cut from the end to the word boundary.
  while (words.length > minWords && widthOf(words.join(' ')) > maxPx) {
    words.pop();
  }
  return words.join(' ');
}
