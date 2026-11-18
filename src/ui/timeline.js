// Timeline chart (SPEC §5.1). Pure renderer: given prepared items + now,
// draw a day-axis Gantt of tournament bars with month labels, grid lines and a
// today line. Row-packs bars so neither a bar nor its label overlaps.

const DAY = 86400000;
const PX_PER_DAY = 14; // stretched so each month has room for its days
const ROW_H = 30; // bar (14) + label above (16)
const HEADER_H = 40; // month name row + day ticks/numbers row
const DAY_LABELS = new Set([5, 10, 15, 20, 25]); // which day-of-month to number
const LABEL_GAP = 10; // px gap kept after a label when packing
const MAX_LABEL_PX = 220;

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

// Canvas for measuring label widths at the real font.
let measureCtx;
function labelWidth(text) {
  if (!measureCtx) {
    measureCtx = document.createElement('canvas').getContext('2d');
    measureCtx.font = "700 11px system-ui, -apple-system, 'Segoe UI', sans-serif";
  }
  return Math.min(Math.ceil(measureCtx.measureText(text).width), MAX_LABEL_PX);
}

const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
function addMonths(d, n) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

/**
 * Render the timeline into `container` (a scrollable element).
 * items: [{ tour, tier, status, expected, barStart, barEnd, barEndBase, ongoingNow }]
 * Keeps the user's horizontal scroll across re-renders; on the first render with
 * data it scrolls so `now` sits in the right third.
 */
export function renderTimeline(container, { items, now }) {
  const prevScroll = container.scrollLeft;
  container.replaceChildren();
  if (!items.length) return;

  // Range: month-aligned start/end covering every bar (and today).
  let min = Math.min(now, ...items.map((i) => i.barStart));
  let max = Math.max(now, ...items.map((i) => i.barEnd));
  const rangeStart = startOfMonth(new Date(min)).getTime();
  const rangeEndMonth = addMonths(new Date(max), 1); // first day of month after max
  const totalDays = Math.ceil((rangeEndMonth.getTime() - rangeStart) / DAY);
  const width = totalDays * PX_PER_DAY;
  const x = (ms) => ((ms - rangeStart) / DAY) * PX_PER_DAY;

  const inner = document.createElement('div');
  inner.className = 'timeline-inner';
  inner.style.width = width + 'px';

  // Month grid lines + labels, plus per-day ticks and day numbers.
  let m = startOfMonth(new Date(rangeStart));
  let first = true;
  while (m.getTime() < rangeEndMonth.getTime()) {
    const left = x(m.getTime());
    const isYear = m.getMonth() === 0;
    const line = document.createElement('div');
    line.className = 'tl-gridline' + (isYear ? ' year' : '');
    line.style.left = left + 'px';
    inner.append(line);

    const label = document.createElement('div');
    label.className = 'tl-month';
    label.style.left = left + 'px';
    label.textContent =
      first || isYear
        ? `${MONTHS[m.getMonth()]} ${m.getFullYear()}`
        : MONTHS[m.getMonth()];
    inner.append(label);

    // Day ticks + numbers for this month (iterate by calendar day, DST-safe).
    const year = m.getFullYear();
    const mon = m.getMonth();
    const daysInMonth = new Date(year, mon + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const dx = x(new Date(year, mon, d).getTime());
      const tick = document.createElement('div');
      tick.className = 'tl-daytick';
      tick.style.left = dx + 'px';
      inner.append(tick);
      if (DAY_LABELS.has(d)) {
        const num = document.createElement('div');
        num.className = 'tl-daynum';
        num.style.left = dx + 'px';
        num.textContent = String(d);
        inner.append(num);
      }
    }

    first = false;
    m = addMonths(m, 1);
  }

  // Today line.
  const today = document.createElement('div');
  today.className = 'tl-today';
  today.style.left = x(now) + 'px';
  today.title = 'Today';
  inner.append(today);

  // Row packing: sort by start, place in first row that's free.
  const sorted = [...items].sort((a, b) => a.barStart - b.barStart);
  const rowRight = []; // rightmost occupied px per row
  let rowCount = 0;

  for (const it of sorted) {
    const left = x(it.barStart);
    const barRight = x(it.barEnd);
    const name = it.tour.name || '';
    const occRight = Math.max(barRight, left + labelWidth(name)) + LABEL_GAP;

    let row = 0;
    while (row < rowRight.length && rowRight[row] > left) row++;
    rowRight[row] = occRight;
    if (row + 1 > rowCount) rowCount = row + 1;

    const top = HEADER_H + row * ROW_H + 14; // +14 so the label sits above the bar

    const item = document.createElement('div');
    item.className = 'tl-item';
    item.style.left = left + 'px';
    item.style.top = top + 'px';
    item.style.width = Math.max(barRight - left, 2) + 'px';
    item.title = name;

    // Base bar (scheduled portion), coloured by status.
    const base = document.createElement('div');
    base.className = 'tl-bar ' + it.status;
    base.style.left = '0';
    base.style.width = Math.max(x(it.barEndBase) - left, 2) + 'px';
    item.append(base);

    // Striped extension for "expected" rounds.
    if (it.expected && it.barEnd > it.barEndBase) {
      const ext = document.createElement('div');
      ext.className = 'tl-bar ext';
      ext.style.left = x(it.barEndBase) - left + 'px';
      ext.style.width = Math.max(barRight - x(it.barEndBase), 2) + 'px';
      item.append(ext);
    }

    // Label above the bar. ("Playing now" tours read green via the bar colour.)
    const label = document.createElement('div');
    label.className = 'tl-label' + (it.tier === 5 ? ' tier5' : '');
    label.style.maxWidth = MAX_LABEL_PX + 'px';
    label.append(document.createTextNode(name));
    item.append(label);

    item.addEventListener('click', () => {
      location.hash = '#/t/' + it.tour.id;
    });

    inner.append(item);
  }

  inner.style.height = HEADER_H + rowCount * ROW_H + 10 + 'px';
  container.append(inner);

  // Scroll: keep today centred until the user scrolls. The timeline loads
  // month-by-month, so each redraw re-centres (otherwise the first partial
  // render's position drifts as earlier months arrive). Once the user scrolls
  // with the wheel or a drag, we stop re-centring and keep their place.
  if (!container.__scrollBound) {
    container.__scrollBound = true;
    const markUser = () => {
      container.dataset.userScrolled = '1';
    };
    container.addEventListener('wheel', markUser, { passive: true });
    container.addEventListener('pointerdown', markUser);
  }
  if (container.dataset.userScrolled) {
    container.scrollLeft = prevScroll;
  } else {
    container.scrollLeft = Math.max(0, x(now) - container.clientWidth / 2);
  }
}
