// Country flag for a FIDE federation code (SPEC §4.4).
// Maps `fed` → flag-icons class via fide-feds.json. FID → globe; any other
// code without a flag (or unknown) → a small grey box with the 3 letters.
import feds from '../data/fide-feds.json';

/**
 * Build a flag element for a federation code. Returns an empty span when there
 * is no code. All text set via textContent (codes/names are untrusted).
 */
export function makeFlag(fed) {
  const span = document.createElement('span');
  span.className = 'flag';
  if (!fed) return span;

  const entry = feds[fed];

  if (entry && entry.flag) {
    const fi = document.createElement('span');
    fi.className = `fi fi-${entry.flag}`;
    fi.title = entry.name;
    span.append(fi);
    return span;
  }

  if (fed === 'FID') {
    // Players under the FIDE flag — a small globe, like Lichess.
    const globe = document.createElement('span');
    globe.className = 'flag-globe';
    globe.textContent = '🌐';
    globe.title = (entry && entry.name) || 'FIDE';
    span.append(globe);
    return span;
  }

  // Null-flag or unknown code → 3-letter grey box.
  const box = document.createElement('span');
  box.className = 'flag-code';
  box.textContent = fed;
  box.title = (entry && entry.name) || fed;
  span.append(box);
  return span;
}
