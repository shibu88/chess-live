// Past / Now / Upcoming tournament card columns beneath the timeline.
// Pure renderer from classified tour items. Text via textContent (untrusted).
import { formatShortRange, relativeDays } from '../lib/time.js';

function card(it, { pill, tag } = {}) {
  const a = document.createElement('a');
  a.className = 'tc-card' + (it.ongoingNow ? ' playing' : '');
  a.href = '#/t/' + it.tour.id;

  const top = document.createElement('div');
  top.className = 'tc-top';
  const date = document.createElement('span');
  date.className = 'tc-date';
  date.textContent = formatShortRange(it.tour.dates);
  top.append(date);
  if (pill) {
    const p = document.createElement('span');
    p.className = 'tc-pill';
    p.textContent = pill;
    top.append(p);
  } else if (tag) {
    const t = document.createElement('span');
    t.className = 'tc-tag';
    t.textContent = tag;
    top.append(t);
  }
  a.append(top);

  const name = document.createElement('div');
  name.className = 'tc-name';
  name.textContent = it.tour.name || '';
  a.append(name);

  const info = it.tour.info || {};
  const sub = [info.location, info.format].filter(Boolean);
  if (sub.length) {
    const s = document.createElement('div');
    s.className = 'tc-sub';
    s.textContent = sub.join(' · ');
    a.append(s);
  }
  return a;
}

function monthHeader(ms) {
  const h = document.createElement('div');
  h.className = 'tc-month';
  h.textContent = new Date(ms)
    .toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
    .toUpperCase();
  return h;
}

// Append cards, inserting a month sub-header when the start month changes.
function appendGrouped(body, items, make) {
  let cur = null;
  for (const it of items) {
    const d = new Date(it.barStart);
    const key = d.getFullYear() * 12 + d.getMonth();
    if (key !== cur) {
      body.append(monthHeader(it.barStart));
      cur = key;
    }
    body.append(make(it));
  }
}

function makeCol(dotClass, title, count) {
  const col = document.createElement('div');
  col.className = 'tl-col';
  const head = document.createElement('div');
  head.className = 'tc-head';
  const dot = document.createElement('span');
  dot.className = 'tc-dot ' + dotClass;
  const t = document.createElement('span');
  t.className = 'tc-title';
  t.textContent = title;
  const c = document.createElement('span');
  c.className = 'tc-count';
  c.textContent = `${count} event${count === 1 ? '' : 's'}`;
  head.append(dot, t, c);
  const body = document.createElement('div');
  body.className = 'tc-body';
  col.append(head, body);
  return { col, body };
}

/**
 * renderColumns(container, { past, now, leagues, upcoming, nowMs })
 * Each list is classified items ({ tour, status, barStart, ongoingNow, … }).
 */
export function renderColumns(container, { past, now, leagues, upcoming, nowMs }) {
  container.replaceChildren();
  const cols = document.createElement('div');
  cols.className = 'tl-columns';

  // Past
  const pc = makeCol('past', 'Past tournaments', past.length);
  appendGrouped(pc.body, past, (it) => card(it));
  cols.append(pc.col);

  // Now (+ leagues/seasons sub-group)
  const nc = makeCol('live', 'Now', now.length + leagues.length);
  for (const it of now) {
    nc.body.append(card(it, { tag: it.ongoingNow ? null : 'Between rounds' }));
  }
  if (leagues.length) {
    const sh = document.createElement('div');
    sh.className = 'tc-subhead';
    sh.textContent = 'LEAGUES & SEASONS';
    const desc = document.createElement('div');
    desc.className = 'tc-subdesc';
    desc.textContent =
      'Team leagues that play a round every few weeks over several months.';
    nc.body.append(sh, desc);
    for (const it of leagues) {
      nc.body.append(card(it, { tag: it.ongoingNow ? null : 'Between rounds' }));
    }
  }
  cols.append(nc.col);

  // Upcoming
  const uc = makeCol('upcoming', 'Upcoming', upcoming.length);
  appendGrouped(uc.body, upcoming, (it) =>
    card(it, { pill: relativeDays(it.barStart, nowMs) }),
  );
  cols.append(uc.col);

  if (!past.length && !now.length && !leagues.length && !upcoming.length) {
    const empty = document.createElement('div');
    empty.className = 'state-msg empty-state';
    empty.textContent = 'No tournaments to show.';
    container.append(empty);
    return;
  }
  container.append(cols);
}
