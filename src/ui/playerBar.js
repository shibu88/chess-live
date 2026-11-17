// Player bar for the game viewer (SPEC §5.4): flag · title · name · rating,
// with the frozen clock at the current ply and a result box when finished.
import { makeFlag } from './flag.js';
import { formatClock } from '../lib/time.js';

function resultFor(status, color) {
  if (status === '1-0') return color === 'white' ? '1' : '0';
  if (status === '0-1') return color === 'white' ? '0' : '1';
  if (status === '½-½' || status === '1/2-1/2') return '½';
  return null;
}

/**
 * opts: { player, status, color: 'white'|'black', clock: centis|null }
 * Returns a player-bar element.
 */
export function renderPlayerBar({ player, status, color, clock }) {
  const p = player || {};
  const bar = document.createElement('div');
  bar.className = 'player-bar';

  const left = document.createElement('div');
  left.className = 'pb-left';
  left.append(makeFlag(p.fed));
  if (p.title) {
    const t = document.createElement('span');
    t.className = 'pb-title';
    t.textContent = p.title;
    left.append(t);
  }
  const name = document.createElement('span');
  name.className = 'pb-name';
  name.textContent = p.name || '';
  left.append(name);
  if (p.rating != null) {
    const r = document.createElement('span');
    r.className = 'pb-rating';
    r.textContent = String(p.rating);
    left.append(r);
  }

  const right = document.createElement('div');
  right.className = 'pb-right';
  if (status && status !== '*') {
    const r = resultFor(status, color);
    if (r != null) {
      const box = document.createElement('span');
      box.className = 'pb-result ' + (r === '1' ? 'win' : r === '0' ? 'loss' : 'draw');
      box.textContent = r;
      right.append(box);
    }
  }
  if (clock != null) {
    const c = document.createElement('span');
    c.className = 'pb-clock' + (clock < 1000 ? ' low' : '');
    c.textContent = formatClock(clock);
    right.append(c);
  }

  bar.append(left, right);
  return bar;
}
