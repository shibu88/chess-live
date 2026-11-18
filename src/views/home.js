// Home view — timeline + tournament dropdown & search (SPEC §5.1, §5.2).
import {
  getCalendarMonth,
  getBroadcasts,
  searchBroadcasts,
} from '../api/lichess.js';
import { renderTimeline } from '../ui/timeline.js';
import { renderColumns } from '../ui/tournamentColumns.js';
import { renderFilterMenu } from '../ui/filterMenu.js';
import { matchCountry } from '../lib/country.js';
import { skeleton, emptyState, errorState } from '../ui/states.js';

const DAY = 86400000;
const LS_COLLAPSED = 'chesslive.timeline.collapsed';
const LS_FILTER = 'chesslive.timeline.filter';
const LS_COUNTRY = 'chesslive.timeline.country';

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
  let filter = lsGet(LS_FILTER, 'best,high'); // tiers for "Official" view
  let country = lsGet(LS_COUNTRY, '') || null; // FIDE code when a country is picked
  let collapsed = lsGet(LS_COLLAPSED, '0') === '1';
  const aMap = new Map(); // tour.id -> tour (from A)
  const bMap = new Map(); // tour.id -> bRec (from B)
  let loadToken = 0; // invalidates stale A loads when the filter changes

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
    current: country ? { kind: 'country', fed: country } : { kind: 'official' },
    onSelect: (sel) => {
      // Changing the filter is a fresh start: re-centre the graph on today
      // (like first load), instead of keeping the previous scroll position.
      delete timeline.dataset.userScrolled;
      if (sel.kind === 'country') {
        country = sel.fed;
        lsSet(LS_COUNTRY, country);
        loadCalendar(''); // all official tiers; narrowed client-side by country
      } else {
        country = null;
        filter = 'best,high';
        lsSet(LS_COUNTRY, '');
        lsSet(LS_FILTER, filter);
        loadCalendar(filter);
      }
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

  // Search bar (above the columns).
  const picker = document.createElement('div');
  picker.className = 'picker';
  const searchWrap = document.createElement('div');
  searchWrap.className = 'search-wrap';
  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.placeholder = 'Search tournaments…';
  const searchResults = document.createElement('ul');
  searchResults.className = 'search-results';
  searchWrap.append(searchInput, searchResults);
  picker.append(searchWrap);

  // Past / Now / Upcoming card columns.
  const columns = document.createElement('div');
  columns.className = 'tl-columns-wrap';

  body.append(timeline, picker, columns);
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
  // Does a tour's tier pass the "Official" filter? (used when no country picked)
  function tierAllowed(tier) {
    if (filter === 'best') return tier === 5;
    if (filter === 'best,high') return tier === 4 || tier === 5;
    return true; // All official
  }

  // Active filter predicate: a country match when one is picked, else the tier.
  // Applied to both the graph bars and the Past/Now/Upcoming columns so they
  // always reflect the current selection.
  function tourPasses(tour) {
    if (country) return matchCountry(country, tour);
    return tierAllowed(tour.tier);
  }

  function buildItems() {
    const items = [];
    const seen = new Set();
    for (const tour of aMap.values()) {
      if (!tourPasses(tour)) continue;
      const c = classify(tour, bMap.get(tour.id), now);
      items.push({ tour, tier: tour.tier, ...c });
      seen.add(tour.id);
    }
    // Add live tours from B that fell outside the A window, but only if they
    // pass the active filter — otherwise the filter has no effect.
    for (const [id, bRec] of bMap) {
      if (seen.has(id)) continue;
      if (!tourPasses(bRec.tour)) continue;
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
      if (!tourPasses(bRec.tour)) continue;
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
    const items = buildItems();
    renderTimeline(timeline, { items, now });
    buildColumns(items);
  }

  // --- Data loading ---------------------------------------------------------
  function monthsAround(center, span) {
    const out = [];
    const base = new Date(center.getFullYear(), center.getMonth(), 1);
    for (let i = -span; i <= span; i++) {
      const d = new Date(base.getFullYear(), base.getMonth() + i, 1);
      out.push([d.getFullYear(), d.getMonth() + 1]);
    }
    return out;
  }

  async function loadCalendar(tiers) {
    const token = ++loadToken;
    aMap.clear();
    let anyOk = false;
    for (const [year, month] of monthsAround(new Date(now), 2)) {
      try {
        const list = await getCalendarMonth(year, month, tiers);
        if (token !== loadToken) return anyOk; // filter changed mid-flight
        anyOk = true;
        for (const it of list) {
          if (it.tour?.id) aMap.set(it.tour.id, it.tour);
        }
        draw(); // progressive: redraw as each month arrives
      } catch (err) {
        console.error(`[timeline] calendar ${year}-${month} failed:`, err);
      }
    }
    return anyOk;
  }

  async function loadBroadcasts() {
    try {
      const list = await getBroadcasts({ nb: 100 });
      for (const rec of list) {
        if (rec.tour?.id) bMap.set(rec.tour.id, rec);
      }
      draw();
      return true;
    } catch (err) {
      console.error('[timeline] broadcasts (B) failed:', err);
      return false;
    }
  }

  async function load() {
    timeline.replaceChildren(skeleton('sk-timeline'));
    // Country view loads all official tiers (narrowed client-side); else the tiers.
    const tiers = country ? '' : filter;
    const [calOk, bOk] = await Promise.all([loadCalendar(tiers), loadBroadcasts()]);
    if (collapsed) return;
    if (!calOk && !bOk) {
      timeline.replaceChildren(errorState('Could not reach Lichess.', load));
    } else if (buildItems().length === 0) {
      timeline.replaceChildren(emptyState('No tournaments to show.'));
    }
  }

  // --- Search navigation ----------------------------------------------------
  let searchTimer = null;
  let searchSeq = 0;
  searchInput.addEventListener('input', () => {
    const q = searchInput.value.trim();
    clearTimeout(searchTimer);
    if (q.length < 3) {
      searchResults.replaceChildren();
      return;
    }
    searchTimer = setTimeout(async () => {
      const seq = ++searchSeq;
      try {
        const res = await searchBroadcasts(q);
        if (seq !== searchSeq) return; // a newer search superseded this one
        searchResults.replaceChildren();
        for (const r of res.currentPageResults || []) {
          const li = document.createElement('li');
          const loc = r.tour.info?.location;
          li.textContent = loc ? `${r.tour.name} · ${loc}` : r.tour.name;
          li.addEventListener('click', () => {
            location.hash = '#/t/' + r.tour.id;
          });
          searchResults.append(li);
        }
      } catch (err) {
        console.error('[search] failed:', err);
      }
    }, 400);
  });

  // --- Go -------------------------------------------------------------------
  load();
}
