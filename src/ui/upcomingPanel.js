// Upcoming-match info panel (tournament page). Shown above the pairings when the
// selected round hasn't started yet: a live countdown, the start time in the
// viewer's local zone + CST + IST, and the venue. All text via textContent /
// createElement (names and locations are untrusted).
import { formatInZone, formatCountdown } from '../lib/time.js';

const CST = 'America/Chicago'; // US Central
const IST = 'Asia/Kolkata'; // India

function labelledRow(key, valueNode) {
  const row = document.createElement('div');
  row.className = 'up-row';
  const k = document.createElement('span');
  k.className = 'up-key';
  k.textContent = key;
  const v = document.createElement('span');
  v.className = 'up-val';
  if (typeof valueNode === 'string') v.textContent = valueNode;
  else v.append(valueNode);
  row.append(k, v);
  return row;
}

/**
 * Build the panel for an upcoming round.
 * @param {{round: object, tour: object}} opts
 * @returns {{ el: HTMLElement, stop: () => void } | null} null when the round
 *   has no concrete future start time (nothing to count down to).
 */
export function renderUpcomingPanel({ round, tour }) {
  const startsAt = round?.startsAt;
  if (startsAt == null || startsAt <= Date.now()) return null;

  const panel = document.createElement('div');
  panel.className = 'upcoming-panel';

  // Countdown header.
  const cd = document.createElement('div');
  cd.className = 'up-countdown';
  const cdLabel = document.createElement('span');
  cdLabel.className = 'up-cd-label';
  cdLabel.textContent = 'Starts in';
  const cdValue = document.createElement('span');
  cdValue.className = 'up-cd-value';
  cd.append(cdLabel, cdValue);
  panel.append(cd);

  // Start time in three zones.
  const times = document.createElement('div');
  times.className = 'up-times';
  for (const [label, tz] of [
    ['Your time', undefined],
    ['CST (US)', CST],
    ['IST (India)', IST],
  ]) {
    times.append(labelledRow(label, formatInZone(startsAt, tz)));
  }
  panel.append(times);

  // Venue.
  const meta = document.createElement('div');
  meta.className = 'up-meta';
  const location = tour?.info?.location;
  if (location) meta.append(labelledRow('Venue', location));
  if (meta.childElementCount) panel.append(meta);

  // Live countdown, ticking each second.
  function tick() {
    const text = formatCountdown(startsAt);
    cdValue.textContent = text || 'starting now';
    if (!text) clearInterval(id); // reached the start time
  }
  tick();
  const id = setInterval(tick, 1000);

  return { el: panel, stop: () => clearInterval(id) };
}
