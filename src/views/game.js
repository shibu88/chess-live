// Game viewer (SPEC §5.4): three columns — game list · board + player bars ·
// move list + controls. Finished games only this phase (no live updates, no
// engine). Players from E (getRound); moves/clocks/evals from G (getRoundPgn).
import { getRound, getRoundPgn } from '../api/lichess.js';
import { parseRoundGame } from '../lib/pgn.js';
import { renderBoard } from '../ui/board.js';
import { renderPlayerBar } from '../ui/playerBar.js';
import { renderMoveList } from '../ui/moveList.js';
import { renderGameList } from '../ui/gameList.js';

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
  const status = game?.status || parsed?.headers?.Result || '*';
  const n = parsed ? parsed.fens.length - 1 : 0;

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
  const moves = document.createElement('div');
  moves.className = 'gv-moves';
  const controls = document.createElement('div');
  controls.className = 'gv-controls';
  right.append(moves, controls);

  wrap.append(left, center, right);

  // --- Navigation controls --------------------------------------------------
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

  // --- Keyboard (removed on next route change) -------------------------------
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
  window.addEventListener(
    'hashchange',
    () => window.removeEventListener('keydown', onKey),
    { once: true },
  );

  // --- Draw -----------------------------------------------------------------
  function draw() {
    const flipped = state.orientation === 'black';
    // Black on top unless flipped.
    const topColor = flipped ? 'white' : 'black';
    const botColor = flipped ? 'black' : 'white';
    const topPlayer = topColor === 'white' ? players[0] : players[1];
    const botPlayer = botColor === 'white' ? players[0] : players[1];

    const clk = (color) =>
      parsed
        ? color === 'white'
          ? parsed.clockWhite[state.ply]
          : parsed.clockBlack[state.ply]
        : null;

    topSlot.replaceChildren(
      renderPlayerBar({ player: topPlayer, status, color: topColor, clock: clk(topColor) }),
    );
    botSlot.replaceChildren(
      renderPlayerBar({ player: botPlayer, status, color: botColor, clock: clk(botColor) }),
    );

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
}
