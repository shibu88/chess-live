// Game viewer (SPEC §5.4): three columns — game list · board + player bars ·
// move list + controls. Players from E (getRound); moves/clocks/evals from G
// (getRoundPgn), then live updates from the PGN stream (F) while the round is
// ongoing: follow-live, a red "● Live" button, ticking clocks, auto-close.
import { getRound, getRoundPgn } from '../api/lichess.js';
import { parseRoundGame } from '../lib/pgn.js';
import { renderBoard } from '../ui/board.js';
import { renderPlayerBar } from '../ui/playerBar.js';
import { renderMoveList } from '../ui/moveList.js';
import {
  renderGameList,
  patchGameRow,
  startClockTicker,
} from '../ui/gameList.js';
import { startLiveRound, liveInfo, sideToMoveOf } from '../live/liveRound.js';
import { liveCentis } from '../lib/time.js';

export function renderGame(main, { tourId, roundId, gameId }) {
  const wrap = document.createElement('div');
  wrap.className = 'game-view';
  const loading = document.createElement('p');
  loading.textContent = 'Loading game…';
  wrap.append(loading);
  main.append(wrap);

  Promise.all([getRound(roundId), getRoundPgn(roundId)])
    .then(([e, pgnText]) => {
      const game = (e.games || []).find((g) => g.id === gameId);
      const parsed = parseRoundGame(pgnText, gameId);
      renderViewer(wrap, { e, game, parsed, tourId, roundId, gameId });
    })
    .catch((err) => {
      console.error('[game] load failed:', err);
      wrap.replaceChildren();
      const msg = document.createElement('p');
      msg.textContent = 'Could not load this game.';
      wrap.append(msg);
    });
}

function renderViewer(wrap, { e, game, parsed, tourId, roundId, gameId }) {
  wrap.replaceChildren();

  const players = game?.players || [{}, {}];
  const roundLive = !!e.round?.ongoing;
  let status = game?.status || parsed?.headers?.Result || '*';
  let n = parsed ? parsed.fens.length - 1 : 0;
  // When the latest move for this game arrived (seeded from E's thinkTime).
  let liveEntry = { lastUpdateAt: Date.now() - (game?.thinkTime || 0) * 1000 };

  const state = { ply: n, orientation: 'white' };

  // --- Columns --------------------------------------------------------------
  const left = document.createElement('div');
  left.className = 'gv-left';
  renderGameList(left, {
    round: e.round,
    games: e.games,
    tourId,
    roundId,
    backHref: `#/t/${tourId}/${roundId}`,
    currentGameId: gameId,
  });

  const center = document.createElement('div');
  center.className = 'gv-center';
  const topSlot = document.createElement('div');
  const boardWrap = document.createElement('div');
  boardWrap.className = 'board-wrap';
  const botSlot = document.createElement('div');
  center.append(topSlot, boardWrap, botSlot);

  const right = document.createElement('div');
  right.className = 'gv-right';
  const liveBtn = document.createElement('button');
  liveBtn.type = 'button';
  liveBtn.className = 'live-btn';
  liveBtn.textContent = '● Live';
  liveBtn.hidden = true;
  liveBtn.addEventListener('click', () => go(n));
  const moves = document.createElement('div');
  moves.className = 'gv-moves';
  const controls = document.createElement('div');
  controls.className = 'gv-controls';
  right.append(liveBtn, moves, controls);

  wrap.append(left, center, right);

  // --- Navigation -----------------------------------------------------------
  const go = (p) => {
    state.ply = Math.max(0, Math.min(n, p));
    draw();
  };
  const flip = () => {
    state.orientation = state.orientation === 'white' ? 'black' : 'white';
    draw();
  };
  for (const [label, title, fn] of [
    ['⏮', 'First (Home)', () => go(0)],
    ['◀', 'Previous (←)', () => go(state.ply - 1)],
    ['▶', 'Next (→)', () => go(state.ply + 1)],
    ['⏭', 'Last (End)', () => go(n)],
    ['⇅', 'Flip (f)', flip],
  ]) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'gv-btn';
    b.textContent = label;
    b.title = title;
    b.addEventListener('click', fn);
    controls.append(b);
  }

  // --- Clocks ---------------------------------------------------------------
  function clockFor(color) {
    if (!parsed) return null;
    const base =
      color === 'white'
        ? parsed.clockWhite[state.ply]
        : parsed.clockBlack[state.ply];
    // Tick only the side to move, at the latest ply of a live unfinished game.
    if (roundLive && status === '*' && state.ply === n) {
      if (color === sideToMoveOf(parsed.fens[n])) {
        return liveCentis(base, liveEntry.lastUpdateAt);
      }
    }
    return base; // frozen
  }

  function drawBars() {
    const flipped = state.orientation === 'black';
    const topColor = flipped ? 'white' : 'black'; // Black on top unless flipped
    const botColor = flipped ? 'black' : 'white';
    const topPlayer = topColor === 'white' ? players[0] : players[1];
    const botPlayer = botColor === 'white' ? players[0] : players[1];
    topSlot.replaceChildren(
      renderPlayerBar({ player: topPlayer, status, color: topColor, clock: clockFor(topColor) }),
    );
    botSlot.replaceChildren(
      renderPlayerBar({ player: botPlayer, status, color: botColor, clock: clockFor(botColor) }),
    );
  }

  // --- Draw -----------------------------------------------------------------
  function draw() {
    drawBars();
    liveBtn.hidden = !(roundLive && status === '*' && state.ply < n);

    if (!parsed) {
      boardWrap.textContent = 'Moves not available for this game yet.';
      moves.replaceChildren();
      return;
    }
    renderBoard(boardWrap, {
      fen: parsed.fens[state.ply],
      orientation: state.orientation,
      lastMove: parsed.lastMove[state.ply],
      checkSquare: parsed.check[state.ply],
    });
    renderMoveList(moves, {
      sans: parsed.sans,
      evals: parsed.evals,
      currentPly: state.ply,
      onPick: go,
    });
  }

  draw();

  // --- Keyboard -------------------------------------------------------------
  const onKey = (ev) => {
    if (ev.target && /^(INPUT|TEXTAREA)$/.test(ev.target.tagName)) return;
    switch (ev.key) {
      case 'ArrowLeft': go(state.ply - 1); ev.preventDefault(); break;
      case 'ArrowRight': go(state.ply + 1); ev.preventDefault(); break;
      case 'Home': go(0); ev.preventDefault(); break;
      case 'End': go(n); ev.preventDefault(); break;
      case 'f': case 'F': flip(); break;
      default: break;
    }
  };
  window.addEventListener('keydown', onKey);

  // --- Live (stream F) ------------------------------------------------------
  const cleanups = [() => window.removeEventListener('keydown', onKey)];

  if (roundLive) {
    const thinkById = new Map(
      (e.games || []).map((g) => [g.id, g.thinkTime || 0]),
    );
    const live = startLiveRound(roundId, {
      initialThink: (id) => thinkById.get(id) || 0,
      onGame: (id, entry) => {
        if (entry.parsed) {
          patchGameRow(left, id, liveInfo(entry.parsed, entry.lastUpdateAt));
        }
        if (id !== gameId || !entry.parsed) return;
        // Update the open game.
        const wasAtLatest = state.ply === n;
        parsed = entry.parsed;
        n = parsed.fens.length - 1;
        const result = parsed.headers.Result;
        status = result && result !== '*' ? result : '*';
        liveEntry = entry;
        if (wasAtLatest) state.ply = n; // follow the latest move
        draw();
      },
    });
    const stopListTick = startClockTicker(left);
    const barTick = setInterval(drawBars, 1000); // tick the centre clocks
    cleanups.push(live.close, stopListTick, () => clearInterval(barTick));
  }

  window.addEventListener(
    'hashchange',
    () => cleanups.forEach((fn) => fn()),
    { once: true },
  );
}
