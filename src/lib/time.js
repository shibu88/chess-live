// Time + clock formatting (SPEC §5.3, §5.4). Dates render in the visitor's
// local timezone. Reused by the tournament page, game viewer and live phases.

/**
 * Format a chess clock. `centis` = centiseconds (Lichess `clock` / `[%clk]`).
 * `h:mm:ss` from one hour up, else `mm:ss`. Never below 0:00.
 * The caller decides when to colour it red (< 10 s).
 */
export function formatClock(centis) {
  let s = Math.max(0, Math.floor((centis ?? 0) / 100));
  const h = Math.floor(s / 3600);
  s -= h * 3600;
  const m = Math.floor(s / 60);
  s -= m * 60;
  const pad = (n) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/** Local date + time, e.g. "17 Nov 2026, 14:30". */
export function formatDateTime(ms) {
  if (ms == null) return '';
  return new Date(ms).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Local date only, e.g. "17 Nov 2026". */
export function formatDate(ms) {
  if (ms == null) return '';
  return new Date(ms).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Format a tour's `dates` ([start] or [start, end], ms) as a local range.
 * Single day → one date; a range → "start – end".
 */
export function formatDateRange(dates) {
  if (!dates || dates[0] == null) return '';
  const start = formatDate(dates[0]);
  if (dates[1] == null || dates[1] === dates[0]) return start;
  return `${start} – ${formatDate(dates[1])}`;
}
