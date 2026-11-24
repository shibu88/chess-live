// Home view — timeline + tournament dropdown & search (SPEC §5.1, §5.2).
import { getCalendarMonth, getBroadcasts } from '../api/lichess.js';
import { renderTimeline } from '../ui/timeline.js';
import { renderColumns } from '../ui/tournamentColumns.js';
import { renderFilterMenu } from '../ui/filterMenu.js';
import { matchCountry, matchIndiaState } from '../lib/country.js';
import { indexTours } from '../lib/tourIndex.js';
import { skeleton, emptyState, errorState } from '../ui/states.js';

const DAY = 86400000;
const LS_COLLAPSED = 'chesslive.timeline.collapsed';
const LS_VIEW = 'chesslive.timeline.view'; // 'top' | 'all' (default: top)
const LS_COUNTRY = 'chesslive.timeline.country'; // FIDE code, or ''
const LS_STATE = 'chesslive.timeline.state'; // Indian state key (India only), or ''
const LS_TIER = 'chesslive.timeline.tier'; // 'main' (tier 4-5) | 'lower' (tier 3)
const LS_CAL = 'chesslive.cal.'; // + tiers key → cached calendar for instant paint
const CAL_TTL = 24 * 60 * 60 * 1000; // show a saved calendar for up to a day

// --- localStorage helpers (always wrapped — SPEC browser-storage rule) ------
function lsGet(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v == null ? fallback : v;
  } catch {
    return fallback;
  }
}
function lsSet(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* private mode / blocked — ignore */
  }
}

// --- Classification (SPEC §5.1 colours) ------------------------------------
// bRec = that tour's record from endpoint B (or undefined).
function classify(tour, bRec, now) {
  const dates = tour.dates || [];
  const barStart = dates[0];
  const barEndBase = (dates[1] ?? dates[0]) + DAY;
  const rounds = bRec?.rounds || [];
  const ongoingNow = rounds.some((r) => r.ongoing === true);

  if (barStart == null) {
    // No dates: treat as upcoming, drawn as a point at "now".
    return {
      status: 'upcoming',
      expected: false,
      barStart: now,
      barEndBase: now + DAY,
      barEnd: now + DAY,
      ongoingNow,
    };
  }

  // A round being played right now wins — show it green ("playing now").
  if (ongoingNow) {
    return {
      status: 'playing',
      expected: false,
      barStart,
      barEndBase,
      barEnd: barEndBase,
      ongoingNow,
    };
  }

  const started = barStart <= now;
  if (!started) {
    // Upcoming; "expected" if B has unscheduled / after-previous rounds.
    let barEnd = barEndBase;
    let expected = false;
    if (bRec) {
      const n = rounds.filter(
        (r) => r.startsAfterPrevious || r.startsAt == null,
      ).length;
      if (n > 0) {
        expected = true;
        barEnd = barEndBase + n * DAY;
      }
    }
    return { status: 'upcoming', expected, barStart, barEndBase, barEnd, ongoingNow };
  }

  // Started → live unless finished.
  const finished = bRec
    ? rounds.length > 0 && rounds.every((r) => r.finishedAt)
    : barEndBase <= now;
  return {
    status: finished ? 'past' : 'live',
    expected: false,
    barStart,
    barEndBase,
    barEnd: barEndBase,
    ongoingNow,
  };
}

// --- View -------------------------------------------------------------------
export function renderHome(main) {
  const now = Date.now();

  // State.
  // quantity: "Top" = the top ~10 ranked events of the selection, "All" = every
  // event. country/stateKey narrow the selection by location (state = India only).
  let quantity = lsGet(LS_VIEW, 'top'); // 'top' | 'all'
  if (quantity !== 'all' && quantity !== 'top') quantity = 'top';
  let country = lsGet(LS_COUNTRY, '') || null; // FIDE code when a country is picked
  let stateKey = lsGet(LS_STATE, '') || null; // Indian state key (India only)
  if (stateKey && country !== 'IND') stateKey = null; // states are India-only
  let tier = lsGet(LS_TIER, 'main'); // 'main' (tier 4-5) | 'lower' (tier 3)
  if (tier !== 'main' && tier !== 'lower') tier = 'main';
  let collapsed = lsGet(LS_COLLAPSED, '0') === '1';
  const aMap = new Map(); // tour.id -> tour (from A)
  const bMap = new Map(); // tour.id -> bRec (from B)
  let loadToken = 0; // invalidates stale A loads when the filter changes
  let allowedIds = null; // set per draw: top-N id set when capping, else null

  // Which calendar tiers to fetch: "Main" (tier 4-5) only needs the upper tiers;
  // "Lower tier" (tier 3) needs the full, un-tiered calendar.
  const tiersFor = () => (tier === 'main' ? 'best,high' : '');

  // --- Panel skeleton -------------------------------------------------------
  const panel = document.createElement('div');
  panel.className = 'panel';

  const head = document.createElement('div');
  head.className = 'panel-head';

  const collapseBtn = document.createElement('button');
  collapseBtn.className = 'collapse';
  collapseBtn.type = 'button';

  const title = document.createElement('h2');
  title.textContent = 'Top tournaments';

  const filterMenu = renderFilterMenu({
    current: { quantity, country, state: stateKey, tier },
    onSelect: (sel) => {
      // Changing the filter is a fresh start: re-centre the graph on today
      // (like first load), instead of keeping the previous scroll position.
      delete timeline.dataset.userScrolled;
      quantity = sel.quantity === 'all' ? 'all' : 'top';
      country = sel.country || null;
      stateKey = country === 'IND' ? sel.state || null : null;
      tier = sel.tier === 'lower' ? 'lower' : 'main';
      lsSet(LS_VIEW, quantity);
      lsSet(LS_COUNTRY, country || '');
      lsSet(LS_STATE, stateKey || '');
      lsSet(LS_TIER, tier);
      loadCalendar(tiersFor());
    },
  });

  const legend = document.createElement('div');
  legend.className = 'legend';
  for (const [cls, text] of [
    ['past', 'Past'],
    ['playing', 'Playing now'],
    ['live', 'Ongoing'],
    ['upcoming', 'Upcoming'],
    ['expected', 'Expected'],
  ]) {
    const span = document.createElement('span');
    const sw = document.createElement('span');
    sw.className = 'swatch ' + cls;
    span.append(sw, document.createTextNode(text));
    legend.append(span);
  }

  head.append(collapseBtn, title, filterMenu, legend);

  const body = document.createElement('div');
  body.className = 'panel-body';

  const timeline = document.createElement('div');
  timeline.className = 'timeline';

  // Tournament search now lives in the header bar (see main.js); the loaded
  // tours are shared through tourIndex so it can match them instantly.

  // Past / Now / Upcoming card columns.
  const columns = document.createElement('div');
  columns.className = 'tl-columns-wrap';

  body.append(timeline, columns);
  panel.append(head, body);
  main.append(panel);

  // --- Collapse -------------------------------------------------------------
  function applyCollapsed() {
    collapseBtn.textContent = collapsed ? '▸' : '▾';
    collapseBtn.setAttribute('aria-expanded', String(!collapsed));
    body.hidden = collapsed;
  }
  applyCollapsed();
  collapseBtn.addEventListener('click', () => {
    collapsed = !collapsed;
    lsSet(LS_COLLAPSED, collapsed ? '1' : '0');
    applyCollapsed();
    if (!collapsed) draw(); // recompute scroll once visible
  });

  // --- Draw (timeline + columns) -------------------------------------------
  // Tier gate: "Main" = elite tiers 4-5, "Lower tier" = local (tier 3 / none).
  function tierPass(tour) {
    const t = tour.tier || 0;
    return tier === 'main' ? t >= 4 : t <= 3;
  }

  // Location + tier gate: a country/state match when one is picked (else every
  // location), AND the active tier band.
  function tourPasses(tour) {
    if (!tierPass(tour)) return false;
    if (country) {
      if (stateKey) {
        return matchCountry('IND', tour) && matchIndiaState(stateKey, tour);
      }
      return matchCountry(country, tour);
    }
    return true;
  }

  // Cap to the top ~10 when: "Main" (always ≤10 main events) or the global "Top"
  // dropdown. "All" + "Lower tier" shows everything. Returns an id set or null.
  function needCap() {
    return tier === 'main' || (!country && quantity === 'top');
  }

  // The top ~10 of the current selection, ranked by Lichess tier then start
  // date. The candidate pool mirrors what the graph actually draws — calendar
  // (A) tours plus only the *live* broadcast (B) tours — so recent events from
  // B that fall outside the graph window don't bump on-graph events out.
  function computeTopIds() {
    if (!needCap()) return null;
    const byId = new Map();
    for (const t of aMap.values()) if (tourPasses(t)) byId.set(t.id, t);
    for (const [id, rec] of bMap) {
      if (byId.has(id) || !tourPasses(rec.tour)) continue;
      const c = classify(rec.tour, rec, now);
      if (c.status === 'live' || c.status === 'playing') byId.set(id, rec.tour);
    }
    const ranked = [...byId.values()].sort(
      (a, b) =>
        (b.tier || 0) - (a.tier || 0) || (b.dates?.[0] || 0) - (a.dates?.[0] || 0),
    );
    return new Set(ranked.slice(0, 10).map((t) => t.id));
  }

  // Passes the location gate AND the "Top" cap (when active).
  function tourVisible(tour) {
    return tourPasses(tour) && (allowedIds == null || allowedIds.has(tour.id));
  }

  function buildItems() {
    const items = [];
    const seen = new Set();
    for (const tour of aMap.values()) {
      if (!tourVisible(tour)) continue;
      const c = classify(tour, bMap.get(tour.id), now);
      items.push({ tour, tier: tour.tier, ...c });
      seen.add(tour.id);
    }
    // Add live tours from B that fell outside the A window, but only if they
    // pass the active filter — otherwise the filter has no effect.
    for (const [id, bRec] of bMap) {
      if (seen.has(id)) continue;
      if (!tourVisible(bRec.tour)) continue;
      const c = classify(bRec.tour, bRec, now);
      if (c.status === 'live' || c.status === 'playing') {
        items.push({ tour: bRec.tour, tier: bRec.tour.tier, ...c });
      }
    }
    return items;
  }

  const LEAGUE_SPAN = 40 * DAY; // a "league/season" runs this long or more

  function buildColumns(items) {
    // Union of timeline tours and all B tours, classified.
    const byId = new Map();
    for (const it of items) byId.set(it.tour.id, it);
    for (const [id, bRec] of bMap) {
      if (byId.has(id)) continue;
      if (!tourVisible(bRec.tour)) continue;
      const c = classify(bRec.tour, bRec, now);
      byId.set(id, { tour: bRec.tour, tier: bRec.tour.tier, ...c });
    }

    const past = [];
    const nowList = [];
    const leagues = [];
    const upcoming = [];
    for (const it of byId.values()) {
      if (it.status === 'past') past.push(it);
      else if (it.status === 'live' || it.status === 'playing') {
        (it.barEnd - it.barStart >= LEAGUE_SPAN ? leagues : nowList).push(it);
      } else upcoming.push(it);
    }
    past.sort((a, b) => b.barStart - a.barStart);
    upcoming.sort((a, b) => a.barStart - b.barStart);
    const liveSort = (a, b) =>
      Number(b.ongoingNow) - Number(a.ongoingNow) ||
      a.tour.name.localeCompare(b.tour.name);
    nowList.sort(liveSort);
    leagues.sort(liveSort);

    renderColumns(columns, { past, now: nowList, leagues, upcoming, nowMs: now });
  }

  function draw() {
    if (collapsed) return;
    allowedIds = computeTopIds(); // recompute the Top-N cap for this selection
    const items = buildItems();
    renderTimeline(timeline, { items, now });
    buildColumns(items);
  }

  // --- Data loading ---------------------------------------------------------
  // Centre-out order (0, +1, -1, +2, -2) so today's month — the visible,
  // centred part of the graph — loads first through the one-at-a-time queue.
  function monthsAround(center, span) {
    const base = new Date(center.getFullYear(), center.getMonth(), 1);
    const offsets = [0];
    for (let i = 1; i <= span; i++) offsets.push(i, -i);
    return offsets.map((i) => {
      const d = new Date(base.getFullYear(), base.getMonth() + i, 1);
      return [d.getFullYear(), d.getMonth() + 1];
    });
  }

  // Calendar localStorage cache — a slim copy so a repeat open paints the whole
  // graph instantly, before the fresh fetch returns.
  const calKey = (tiers) => LS_CAL + (tiers || 'all');

  function primeFromCache(tiers) {
    try {
      const data = JSON.parse(lsGet(calKey(tiers), '') || 'null');
      if (!data || data.v !== 1 || !Array.isArray(data.tours)) return false;
      if (Date.now() - (data.savedAt || 0) > CAL_TTL) return false;
      aMap.clear();
      for (const t of data.tours) if (t?.id) aMap.set(t.id, t);
      return aMap.size > 0;
    } catch {
      return false;
    }
  }

  function saveToCache(tiers) {
    // Keep only the fields the home graph/columns use (keeps it small).
    const tours = [...aMap.values()].map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      tier: t.tier,
      dates: t.dates,
      info: t.info ? { location: t.info.location, format: t.info.format } : undefined,
    }));
    lsSet(calKey(tiers), JSON.stringify({ v: 1, savedAt: Date.now(), tours }));
  }

  async function loadCalendar(tiers) {
    const token = ++loadToken;
    // Instant paint from the last saved copy for this filter, then refresh.
    if (primeFromCache(tiers)) {
      indexTours(aMap.values()); // instant header-search matches on repeat opens
      draw();
    } else aMap.clear();

    const fresh = new Map();
    let anyOk = false;
    let allOk = true;
    for (const [year, month] of monthsAround(new Date(now), 2)) {
      try {
        const list = await getCalendarMonth(year, month, tiers);
        if (token !== loadToken) return anyOk; // filter changed mid-flight
        anyOk = true;
        for (const it of list) {
          if (it.tour?.id) {
            fresh.set(it.tour.id, it.tour);
            aMap.set(it.tour.id, it.tour);
          }
        }
        draw(); // progressive: redraw as each month arrives
      } catch (err) {
        allOk = false;
        console.error(`[timeline] calendar ${year}-${month} failed:`, err);
      }
    }
    if (token !== loadToken) return anyOk;
    if (allOk) {
      // Drop any cache-primed tours that are gone from the fresh data.
      for (const id of [...aMap.keys()]) if (!fresh.has(id)) aMap.delete(id);
      draw();
    }
    if (anyOk) saveToCache(tiers);
    indexTours(aMap.values()); // let the header search match these
    return anyOk;
  }

  async function loadBroadcasts() {
    try {
      const list = await getBroadcasts({ nb: 100 });
      for (const rec of list) {
        if (rec.tour?.id) bMap.set(rec.tour.id, rec);
      }
      draw();
      indexTours([...bMap.values()].map((r) => r.tour)); // feed the header search
      return true;
    } catch (err) {
      console.error('[timeline] broadcasts (B) failed:', err);
      return false;
    }
  }

  async function load() {
    timeline.replaceChildren(skeleton('sk-timeline'));
    // Country view loads all official tiers (narrowed client-side); else the tiers.
    const [calOk, bOk] = await Promise.all([loadCalendar(tiersFor()), loadBroadcasts()]);
    if (collapsed) return;
    if (!calOk && !bOk) {
      timeline.replaceChildren(errorState('Could not reach Lichess.', load));
    } else if (buildItems().length === 0) {
      timeline.replaceChildren(emptyState('No tournaments to show.'));
    }
  }

  // --- Go -------------------------------------------------------------------
  load();
}
