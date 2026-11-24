// Shared, in-memory index of tournaments the home view has loaded (from the
// calendar + broadcasts). Lets the header search offer instant client-side
// matches alongside the Lichess search API. Data only — no DOM.

const tours = new Map(); // id -> tour (name, slug, info, …)

/** Merge tours (any iterable of tour objects) into the index. */
export function indexTours(list) {
  for (const t of list) if (t?.id) tours.set(t.id, t);
}

/**
 * Loaded tours whose name/location contains every whitespace-separated term in
 * `query` (so "bihar state" matches "Bihar State Senior …"). Shorter names —
 * the closer matches — come first.
 */
export function searchLoadedTours(query) {
  const q = (query || '').trim().toLowerCase();
  if (!q) return [];
  const terms = q.split(/\s+/);
  const out = [];
  for (const t of tours.values()) {
    const hay = `${t.name || ''} ${t.info?.location || ''}`.toLowerCase();
    if (terms.every((term) => hay.includes(term))) out.push(t);
  }
  out.sort((a, b) => (a.name?.length || 0) - (b.name?.length || 0));
  return out;
}
