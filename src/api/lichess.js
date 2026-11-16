// Lichess broadcast API client (SPEC §3).
// Every request goes through here. One normal request in flight at a time,
// 429 handling (pause 60 s, retry once), small in-memory cache.
// Endpoints A–E for Phase 0; F/G (streaming) come in Phase 4.

const BASE = 'https://lichess.org';

// --- Busy-status notifications (for a "Lichess is busy" banner) ------------
const statusListeners = new Set();

/** Subscribe to status messages (null = clear). Returns an unsubscribe fn. */
export function onStatus(cb) {
  statusListeners.add(cb);
  return () => statusListeners.delete(cb);
}

function setStatus(message) {
  for (const cb of statusListeners) cb(message);
}

// --- Request queue: only one normal request at a time ----------------------
let chain = Promise.resolve();

function enqueue(task) {
  const run = chain.then(task, task);
  // Keep the chain alive regardless of this task's outcome.
  chain = run.then(
    () => {},
    () => {},
  );
  return run;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// --- Core fetch with 429 handling ------------------------------------------
// Runs inside the queue. On HTTP 429: wait 60 s, retry once.
async function request(path, { parse = 'json' } = {}) {
  const url = BASE + path;

  async function attempt(isRetry) {
    const res = await fetch(url);
    if (res.status === 429) {
      if (isRetry) throw new Error('Lichess rate limit (429) after retry');
      setStatus('Lichess is busy — retrying in 60 s');
      await sleep(60000);
      setStatus(null);
      return attempt(true);
    }
    if (!res.ok) {
      throw new Error(`Lichess ${res.status} for ${path}`);
    }
    if (parse === 'json') return res.json();
    if (parse === 'text') return res.text();
    if (parse === 'ndjson') return readNdjson(res);
    return res;
  }

  return attempt(false);
}

// --- ndjson reader (SPEC §3.4) ---------------------------------------------
// Streams the body, splits on \n, JSON.parses each complete non-empty line.
async function readNdjson(res) {
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  const out = [];
  let buffer = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += value;
    const lines = buffer.split('\n');
    buffer = lines.pop(); // keep the last (possibly partial) line
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed) out.push(JSON.parse(trimmed));
    }
  }
  const tail = buffer.trim();
  if (tail) out.push(JSON.parse(tail));
  return out;
}

// --- In-memory cache (SPEC §3.3) -------------------------------------------
const cache = new Map(); // key -> { value, expires }

function cached(key, ttlMs, producer) {
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.value;
  // Store the promise so concurrent callers share one request.
  const value = producer();
  cache.set(key, { value, expires: Date.now() + ttlMs });
  // If it rejects, drop it so the next call can retry.
  Promise.resolve(value).catch(() => {
    if (cache.get(key)?.value === value) cache.delete(key);
  });
  return value;
}

const TEN_MIN = 10 * 60 * 1000;

// --- Endpoints A–E ----------------------------------------------------------

/**
 * A — Timeline, one month.
 * tiers: comma list of normal,high,best (optional; omit for all official).
 * Returns a JSON array of { tour, round, group? }. Cached 10 min.
 */
export function getCalendarMonth(year, month, tiers = 'best,high') {
  const q = tiers ? `?tiers=${encodeURIComponent(tiers)}` : '';
  const path = `/api/broadcast/calendar/${year}/${month}${q}`;
  return cached(`A:${path}`, TEN_MIN, () => enqueue(() => request(path)));
}

/**
 * B — Live, scheduled and recent broadcasts (ndjson).
 * live=true restricts to rounds being played right now.
 * Returns an array of { tour, rounds[], group?, defaultRoundId? }. Not cached.
 */
export function getBroadcasts({ nb = 100, live = false } = {}) {
  const path = `/api/broadcast?nb=${nb}${live ? '&live=true' : ''}`;
  return enqueue(() => request(path, { parse: 'ndjson' }));
}

/**
 * C — Search tournaments by text.
 * Returns { currentPage, maxPerPage, currentPageResults, previousPage, nextPage }.
 */
export function searchBroadcasts(text, page = 1) {
  const path = `/api/broadcast/search?q=${encodeURIComponent(text)}&page=${page}`;
  return enqueue(() => request(path));
}

/**
 * D — One tournament.
 * Returns { tour, rounds[], defaultRoundId?, group? }. Cached 10 min.
 */
export function getTournament(tourId) {
  const path = `/api/broadcast/${tourId}`;
  return cached(`D:${tourId}`, TEN_MIN, () => enqueue(() => request(path)));
}

/**
 * E — One round with its games (slugs may be "-").
 * Returns { round, tour, study, games[], photos }. Not cached (changes often).
 */
export function getRound(roundId) {
  const path = `/api/broadcast/-/-/${roundId}`;
  return enqueue(() => request(path));
}
