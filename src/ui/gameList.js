// Game list for a broadcast round (SPEC §5.3), styled like Lichess's.
// Pure renderer from endpoint-E data. Reused by the Phase-3 game viewer.
import { makeFlag } from './flag.js';
import { formatClock, formatDateTime, liveCentis } from '../lib/time.js';
import { evalToWhitePct } from '../lib/eval.js';

function resultFor(status, color) {
  if (status === '1-0') return color === 'white' ? '1' : '0';
  if (status === '0-1') return color === 'white' ? '0' : '1';
  if (status === '½-½' || status === '1/2-1/2') return '½';
  return null;
}

// White's share (0..100) for the mini eval bar. A finished game uses its
// result (so 1-0 ≠ ½-½); an ongoing game uses the live eval, or 50 if none.
function whitePctFor(status, ev) {
  if (status === '1-0') return 100;
  if (status === '0-1') return 0;
  if (status === '½-½' || status === '1/2-1/2') return 50;
  return evalToWhitePct(ev);
}

// Right-hand cell for a player: result when finished, else clock, else empty.
function fillRight(right, player, game, color) {
  const status = game.status;
  if (status && status !== '*') {
    const r = resultFor(status, color);
    if (r != null) {
      const box = document.createElement('span');
      box.className =
        'gl-result ' + (r === '1' ? 'win' : r === '0' ? 'loss' : 'draw');
      box.textContent = r;
      right.append(box);
    }
    return;
  }
  // Not finished — show the last known clock (static this phase; ticks in P4).
  if (player && player.clock != null) {
    const c = document.createElement('span');
    c.className = 'gl-clock' + (player.clock < 1000 ? ' low' : ''); // <10s red
    c.textContent = formatClock(player.clock);
    right.append(c);
  }
}

function playerLine(player, game, color) {
  const p = player || {};
  const line = document.createElement('div');
  line.className = 'gl-player';

  const left = document.createElement('span');
  left.className = 'gl-pleft';
  left.append(makeFlag(p.fed));
  if (p.title) {
    const t = document.createElement('span');
    t.className = 'gl-title';
    t.textContent = p.title;
    left.append(t);
  }
  const nm = document.createElement('span');
  nm.className = 'gl-name';
  nm.textContent = p.name || '';
  left.append(nm);

  const right = document.createElement('span');
  right.className = 'gl-right';
  right.dataset.color = color;
  fillRight(right, p, game, color);

  line.append(left, right);
  return line;
}

function makeRow(game, board, { tourId, roundId, currentGameId }) {
  const row = document.createElement('a');
  row.className = 'gl-row' + (game.id === currentGameId ? ' current' : '');
  row.href = `#/t/${tourId}/${roundId}/${game.id}`;
  row.dataset.gameId = game.id;
  const [white, black] = game.players || [{}, {}];
  row.dataset.players = `${white?.name || ''} ${black?.name || ''}`.toLowerCase();

  // Thin vertical mini eval bar. White fills from the top (where the White
  // player is listed). Finished games reflect the result; live ones get the
  // eval via patchGameRow.
  const evalBar = document.createElement('div');
  evalBar.className = 'gl-eval';
  const fill = document.createElement('div');
  fill.className = 'gl-eval-fill';
  fill.style.height = whitePctFor(game.status) + '%';
  evalBar.append(fill);

  const num = document.createElement('div');
  num.className = 'gl-num';
  num.textContent = String(board);

  const players = document.createElement('div');
  players.className = 'gl-players';
  players.append(playerLine(white, game, 'white'), playerLine(black, game, 'black'));

  row.append(evalBar, num, players);
  return row;
}

/**
 * Render the game list into `container`.
 * opts: { round, games, tourId, roundId, backHref, currentGameId? }
 */
export function renderGameList(container, opts) {
  const { round, games, tourId, roundId, backHref, currentGameId } = opts;
  container.replaceChildren();

  // Header bar: back, round name, filter toggle.
  const head = document.createElement('div');
  head.className = 'gl-head';
  const back = document.createElement('a');
  back.className = 'gl-back';
  back.href = backHref || '#/';
  back.textContent = '‹';
  back.title = 'Back';
  const name = document.createElement('span');
  name.className = 'gl-round';
  name.textContent = round?.name || '';
  const searchBtn = document.createElement('button');
  searchBtn.className = 'gl-search-btn';
  searchBtn.type = 'button';
  searchBtn.textContent = '🔍';
  searchBtn.title = 'Filter by player';
  head.append(back, name, searchBtn);
  container.append(head);

  const filterBox = document.createElement('input');
  filterBox.type = 'text';
  filterBox.className = 'gl-filter';
  filterBox.placeholder = 'Filter by player…';
  filterBox.hidden = true;
  container.append(filterBox);

  if (!games || games.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'gl-empty';
    const starts = round?.startsAt
      ? ` · starts ${formatDateTime(round.startsAt)}`
      : '';
    empty.textContent = `Pairings not published yet${starts}`;
    container.append(empty);
    return;
  }

  const list = document.createElement('div');
  list.className = 'gl-list';
  games.forEach((g, i) =>
    list.append(makeRow(g, i + 1, { tourId, roundId, currentGameId })),
  );
  container.append(list);

  // Filter toggle + live filtering by player name.
  function applyFilter(q) {
    const term = q.trim().toLowerCase();
    for (const row of list.children) {
      row.hidden = term && !(row.dataset.players || '').includes(term);
    }
  }
  searchBtn.addEventListener('click', () => {
    filterBox.hidden = !filterBox.hidden;
    if (filterBox.hidden) {
      filterBox.value = '';
      applyFilter('');
    } else {
      filterBox.focus();
    }
  });
  filterBox.addEventListener('input', () => applyFilter(filterBox.value));
}

// --- Live updates (SPEC §5.4) ---------------------------------------------

function rightCellContent(right, color, live) {
  right.replaceChildren();
  if (live.status && live.status !== '*') {
    const r = resultFor(live.status, color);
    if (r != null) {
      const box = document.createElement('span');
      box.className =
        'gl-result ' + (r === '1' ? 'win' : r === '0' ? 'loss' : 'draw');
      box.textContent = r;
      right.append(box);
    }
    return;
  }
  const base = color === 'white' ? live.clockWhite : live.clockBlack;
  if (base != null) {
    const c = document.createElement('span');
    c.className = 'gl-clock' + (base < 1000 ? ' low' : '');
    c.textContent = formatClock(base);
    right.append(c);
  }
}

/**
 * Patch one row from a live snapshot. Stores `live` on the row for the ticker.
 * live = { status, clockWhite, clockBlack, sideToMove, lastUpdateAt, eval }.
 */
export function patchGameRow(container, gameId, live) {
  const row = container.querySelector(
    `.gl-row[data-game-id="${CSS.escape(gameId)}"]`,
  );
  if (!row) return;
  row._live = live;

  const fill = row.querySelector('.gl-eval-fill');
  if (fill) fill.style.height = whitePctFor(live.status, live.eval) + '%';

  for (const color of ['white', 'black']) {
    const right = row.querySelector(`.gl-right[data-color="${color}"]`);
    if (right) rightCellContent(right, color, live);
  }
}

/**
 * Start a 1 s ticker that counts down the side-to-move clock in each live row.
 * Returns a stop function.
 */
export function startClockTicker(container) {
  const id = setInterval(() => {
    for (const row of container.querySelectorAll('.gl-row')) {
      const live = row._live;
      if (!live || (live.status && live.status !== '*') || !live.sideToMove) continue;
      const base =
        live.sideToMove === 'white' ? live.clockWhite : live.clockBlack;
      const rem = liveCentis(base, live.lastUpdateAt);
      const cell = row.querySelector(
        `.gl-right[data-color="${live.sideToMove}"] .gl-clock`,
      );
      if (cell && rem != null) {
        cell.textContent = formatClock(rem);
        cell.classList.toggle('low', rem < 1000);
      }
    }
  }, 1000);
  return () => clearInterval(id);
}
