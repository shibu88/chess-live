// Game list for a broadcast round (SPEC §5.3), styled like Lichess's.
// Pure renderer from endpoint-E data. Reused by the Phase-3 game viewer.
import { makeFlag } from './flag.js';
import { formatClock, formatDateTime } from '../lib/time.js';

function resultFor(status, color) {
  if (status === '1-0') return color === 'white' ? '1' : '0';
  if (status === '0-1') return color === 'white' ? '0' : '1';
  if (status === '½-½' || status === '1/2-1/2') return '½';
  return null;
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
  fillRight(right, p, game, color);

  line.append(left, right);
  return line;
}

function makeRow(game, board, { tourId, roundId, currentGameId }) {
  const row = document.createElement('a');
  row.className = 'gl-row' + (game.id === currentGameId ? ' current' : '');
  row.href = `#/t/${tourId}/${roundId}/${game.id}`;
  const [white, black] = game.players || [{}, {}];
  row.dataset.players = `${white?.name || ''} ${black?.name || ''}`.toLowerCase();

  // Thin vertical mini eval bar (neutral 50% until we have evals, Phase 4).
  const evalBar = document.createElement('div');
  evalBar.className = 'gl-eval';
  const fill = document.createElement('div');
  fill.className = 'gl-eval-fill';
  fill.style.height = '50%';
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
