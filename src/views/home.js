// Home view — timeline + tournament dropdown & search (SPEC §5.1, §5.2).
import {
  getCalendarMonth,
  getBroadcasts,
  searchBroadcasts,
} from '../api/lichess.js';
import { renderTimeline } from '../ui/timeline.js';

const DAY = 86400000;
const LS_COLLAPSED = 'chesslive.timeline.collapsed';
const LS_FILTER = 'chesslive.timeline.filter';

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
  let filter = lsGet(LS_FILTER, 'best,high'); // "best" | "best,high" | ""
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

  const filterSel = document.createElement('select');
  filterSel.className = 'filter';
  for (const [value, label] of [
    ['best', 'Top tier only'],
    ['best,high', 'Top + high'],
    ['', 'All official'],
  ]) {
    const opt = document.createElement('option');
    opt.value = value;
    opt.textContent = label;
    filterSel.append(opt);
  }
  filterSel.value = filter;

  const legend = document.createElement('div');
  legend.className = 'legend';
  for (const [cls, text] of [
    ['past', 'Past'],
    ['playing', 'Playing now'],
    ['live', 'Live'],
    ['upcoming', 'Upcoming'],
    ['expected', 'Expected'],
  ]) {
    const span = document.createElement('span');
    const sw = document.createElement('span');
    sw.className = 'swatch ' + cls;
    span.append(sw, document.createTextNode(text));
    legend.append(span);
  }

  head.append(collapseBtn, title, filterSel, legend);

  const body = document.createElement('div');
  body.className = 'panel-body';

  const timeline = document.createElement('div');
  timeline.className = 'timeline';

  // Picker row: dropdown + search.
  const picker = document.createElement('div');
  picker.className = 'picker';
  const tourSel = document.createElement('select');
  tourSel.className = 'tour-select';
  const searchWrap = document.createElement('div');
  searchWrap.className = 'search-wrap';
  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.placeholder = 'Search tournaments…';
  const searchResults = document.createElement('ul');
  searchResults.className = 'search-results';
  searchWrap.append(searchInput, searchResults);
  picker.append(tourSel, searchWrap);

  body.append(timeline, picker);
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

  // --- Draw (timeline + dropdown) ------------------------------------------
  // Does a tour's tier pass the current filter? (timeline bars only)
  function tierAllowed(tier) {
    if (filter === 'best') return tier === 5;
    if (filter === 'best,high') return tier === 4 || tier === 5;
    return true; // All official
  }

  function buildItems() {
    const items = [];
    const seen = new Set();
    for (const tour of aMap.values()) {
      const c = classify(tour, bMap.get(tour.id), now);
      items.push({ tour, tier: tour.tier, ...c });
      seen.add(tour.id);
    }
    // Add live tours from B that fell outside the A window, but only if their
    // tier passes the active filter — otherwise the filter has no effect.
    for (const [id, bRec] of bMap) {
      if (seen.has(id)) continue;
      if (!tierAllowed(bRec.tour.tier)) continue;
      const c = classify(bRec.tour, bRec, now);
      if (c.status === 'live' || c.status === 'playing') {
        items.push({ tour: bRec.tour, tier: bRec.tour.tier, ...c });
      }
    }
    return items;
  }

  function buildDropdown(items) {
    // Union of timeline tours and all B tours, classified, grouped.
    const byId = new Map();
    for (const it of items) byId.set(it.tour.id, it);
    for (const [id, bRec] of bMap) {
      if (!byId.has(id)) {
        const c = classify(bRec.tour, bRec, now);
        byId.set(id, { tour: bRec.tour, tier: bRec.tour.tier, ...c });
      }
    }
    // "Playing now" tours belong with "Live now" in the dropdown.
    const groups = { live: [], upcoming: [], past: [] };
    for (const it of byId.values()) {
      const key = it.status === 'playing' ? 'live' : it.status;
      groups[key].push(it);
    }
    // Playing-now first, then alphabetical.
    groups.live.sort(
      (a, b) =>
        Number(b.ongoingNow) - Number(a.ongoingNow) ||
        a.tour.name.localeCompare(b.tour.name),
    );
    groups.upcoming.sort((a, b) => a.barStart - b.barStart);
    groups.past.sort((a, b) => b.barStart - a.barStart);

    const prev = tourSel.value;
    tourSel.replaceChildren();
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Jump to a tournament…';
    tourSel.append(placeholder);

    for (const [key, label] of [
      ['live', 'Live now'],
      ['upcoming', 'Upcoming'],
      ['past', 'Finished'],
    ]) {
      if (!groups[key].length) continue;
      const og = document.createElement('optgroup');
      og.label = label;
      for (const it of groups[key]) {
        const opt = document.createElement('option');
        opt.value = it.tour.id;
        const loc = it.tour.info?.location;
        opt.textContent = loc ? `${it.tour.name} · ${loc}` : it.tour.name;
        og.append(opt);
      }
      tourSel.append(og);
    }
    if (prev) tourSel.value = prev;
  }

  function draw() {
    if (collapsed) return;
    const items = buildItems();
    renderTimeline(timeline, { items, now });
    buildDropdown(items);
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
    for (const [year, month] of monthsAround(new Date(now), 2)) {
      try {
        const list = await getCalendarMonth(year, month, tiers);
        if (token !== loadToken) return; // filter changed mid-flight
        for (const it of list) {
          if (it.tour?.id) aMap.set(it.tour.id, it.tour);
        }
        draw(); // progressive: redraw as each month arrives
      } catch (err) {
        console.error(`[timeline] calendar ${year}-${month} failed:`, err);
      }
    }
  }

  async function loadBroadcasts() {
    try {
      const list = await getBroadcasts({ nb: 100 });
      for (const rec of list) {
        if (rec.tour?.id) bMap.set(rec.tour.id, rec);
      }
      draw();
    } catch (err) {
      console.error('[timeline] broadcasts (B) failed:', err);
    }
  }

  // --- Filter ---------------------------------------------------------------
  filterSel.addEventListener('change', () => {
    filter = filterSel.value;
    lsSet(LS_FILTER, filter);
    loadCalendar(filter); // reuse the already-loaded B
  });

  // --- Dropdown + search navigation ----------------------------------------
  tourSel.addEventListener('change', () => {
    if (tourSel.value) location.hash = '#/t/' + tourSel.value;
  });

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
  loadCalendar(filter);
  loadBroadcasts();
}
