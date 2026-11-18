// Game viewer (SPEC §5.4, §5.5): three columns — game list · board + player
// bars · engine box + move list + controls. Players from E; moves/clocks/evals
// from G then the live stream (F). Analyze runs Stockfish 19 lite in a Worker.
import { getRound, getRoundPgn } from '../api/lichess.js';
import { parseRoundGame, pvToSan } from '../lib/pgn.js';
import { renderBoard } from '../ui/board.js';
import { renderPlayerBar } from '../ui/playerBar.js';
import { renderMoveList } from '../ui/moveList.js';
import { renderEvalBar } from '../ui/evalBar.js';
import {
  renderGameList,
  patchGameRow,
  startClockTicker,
} from '../ui/gameList.js';
import { startLiveRound, liveInfo, sideToMoveOf } from '../live/liveRound.js';
import { liveCentis } from '../lib/time.js';
import { Engine } from '../engine/engine.js';
import { toWhiteScore, formatEval, whiteScoreToEv } from '../lib/eval.js';
import { skeleton, errorState } from '../ui/states.js';

function gameSkeleton() {
  const view = document.createElement('div');
  view.className = 'game-view';
  const center = document.createElement('div');
  center.className = 'gv-center';
  center.append(skeleton('sk-bar'), skeleton('sk-board'), skeleton('sk-bar'));
  const right = document.createElement('div');
  right.className = 'gv-right';
  for (let i = 0; i < 8; i++) right.append(skeleton('sk-line'));
  view.append(document.createElement('div'), center, right);
  return view;
}

export function renderGame(main, { tourId, roundId, gameId }) {
  const host = document.createElement('div');
  main.append(host);

  function load() {
    host.replaceChildren(gameSkeleton());
    Promise.all([getRound(roundId), getRoundPgn(roundId)])
      .then(([e, pgnText]) => {
        const game = (e.games || []).find((g) => g.id === gameId);
        const parsed = parseRoundGame(pgnText, gameId);
        const wrap = document.createElement('div');
        wrap.className = 'game-view';
        host.replaceChildren(wrap);
        renderViewer(wrap, { e, game, parsed, tourId, roundId, gameId });
      })
      .catch((err) => {
        console.error('[game] load failed:', err);
        host.replaceChildren(errorState('Could not load this game.', load));
      });
  }
  load();
}

function renderViewer(wrap, { e, game, parsed, tourId, roundId, gameId }) {
  wrap.replaceChildren();

  const players = game?.players || [{}, {}];
  if (players[0]?.name && players[1]?.name) {
    document.title = `${players[0].name} – ${players[1].name} · Home`;
  }
  const roundLive = !!e.round?.ongoing;
  let status = game?.status || parsed?.headers?.Result || '*';
  let n = parsed ? parsed.fens.length - 1 : 0;
  let liveEntry = { lastUpdateAt: Date.now() - (game?.thinkTime || 0) * 1000 };

  const state = { ply: n, orientation: 'white' };

  // Analysis state.
  let engine = null;
  let analyzeOn = false;
  let currentEval = null; // { white, depth, pvUci, fen }
  let lastShownFen = null;
  let analyseTimer = null;
  const engineEvals = []; // ply -> White-POV ev (overrides PGN eval in the list)
  let allRunning = false;
  let allCancel = false;

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
  const boardRow = document.createElement('div');
  boardRow.className = 'board-row';
  const evalBarWrap = document.createElement('div');
  evalBarWrap.className = 'eval-bar-wrap';
  evalBarWrap.hidden = true;
  const boardWrap = document.createElement('div');
  boardWrap.className = 'board-wrap';
  boardRow.append(evalBarWrap, boardWrap);
  const botSlot = document.createElement('div');
  center.append(topSlot, boardRow, botSlot);

  const right = document.createElement('div');
  right.className = 'gv-right';

  // Engine box.
  const engineBox = document.createElement('div');
  engineBox.className = 'engine-box';
  const analyzeBtn = document.createElement('button');
  analyzeBtn.type = 'button';
  analyzeBtn.className = 'analyze-btn';
  analyzeBtn.textContent = 'Analyze';
  const evalText = document.createElement('div');
  evalText.className = 'eval-text';
  const infoLine = document.createElement('div');
  infoLine.className = 'engine-info';
  const bestLine = document.createElement('div');
  bestLine.className = 'best-line';
  const analyzeAllBtn = document.createElement('button');
  analyzeAllBtn.type = 'button';
  analyzeAllBtn.className = 'analyze-all-btn';
  analyzeAllBtn.textContent = 'Analyze all moves';
  engineBox.append(analyzeBtn, evalText, infoLine, bestLine, analyzeAllBtn);

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
  right.append(engineBox, liveBtn, moves, controls);

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
      color === 'white' ? parsed.clockWhite[state.ply] : parsed.clockBlack[state.ply];
    if (roundLive && status === '*' && state.ply === n) {
      if (color === sideToMoveOf(parsed.fens[n])) {
        return liveCentis(base, liveEntry.lastUpdateAt);
      }
    }
    return base;
  }

  function drawBars() {
    const flipped = state.orientation === 'black';
    const topColor = flipped ? 'white' : 'black';
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

  function renderMoves() {
    if (!parsed) {
      moves.replaceChildren();
      return;
    }
    const merged = parsed.evals.map((ev, i) =>
      engineEvals[i] !== undefined ? engineEvals[i] : ev,
    );
    renderMoveList(moves, {
      sans: parsed.sans,
      evals: merged,
      currentPly: state.ply,
      onPick: go,
    });
  }

  // --- Analysis UI ----------------------------------------------------------
  function updateEngineUI() {
    evalText.textContent = analyzeOn ? formatEval(currentEval?.white) : '';
    infoLine.textContent = analyzeOn
      ? `Stockfish 19 lite · depth ${currentEval?.depth ?? 0}`
      : '';
    bestLine.textContent =
      analyzeOn && currentEval?.pvUci
        ? pvToSan(currentEval.fen, currentEval.pvUci, 8)
        : '';
  }

  function updateEvalBar() {
    if (analyzeOn && parsed) {
      evalBarWrap.hidden = false;
      renderEvalBar(evalBarWrap, currentEval?.white ?? null, state.orientation);
    } else {
      evalBarWrap.hidden = true;
      evalBarWrap.replaceChildren();
    }
  }

  function onEngineInfo(info) {
    if (!analyzeOn || allRunning || !parsed) return;
    if (info.fen !== parsed.fens[state.ply]) return; // stale
    currentEval = {
      white: toWhiteScore(info.score, sideToMoveOf(info.fen)),
      depth: info.depth,
      pvUci: info.pvUci,
      fen: info.fen,
    };
    updateEngineUI();
    updateEvalBar();
  }

  async function ensureEngine() {
    if (!engine) {
      engine = new Engine();
      await engine.init();
      engine.onInfo(onEngineInfo);
    }
    return engine;
  }

  function scheduleAnalyse() {
    clearTimeout(analyseTimer);
    analyseTimer = setTimeout(() => {
      if (!analyzeOn || allRunning || !parsed || !engine) return;
      engine.analyse(parsed.fens[state.ply], { depth: 22 }).catch(() => {});
    }, 150);
  }

  async function toggleAnalyze() {
    analyzeOn = !analyzeOn;
    analyzeBtn.classList.toggle('on', analyzeOn);
    analyzeBtn.textContent = analyzeOn ? 'Analyze: on' : 'Analyze';
    if (analyzeOn) {
      currentEval = null;
      lastShownFen = parsed ? parsed.fens[state.ply] : null;
      updateEngineUI();
      updateEvalBar();
      try {
        await ensureEngine();
      } catch (err) {
        console.error('[engine] init failed:', err);
        analyzeOn = false;
        analyzeBtn.classList.remove('on');
        analyzeBtn.textContent = 'Analyze';
        evalText.textContent = 'Engine failed to load';
        return;
      }
      scheduleAnalyse();
    } else {
      clearTimeout(analyseTimer);
      if (engine) engine.stop();
      currentEval = null;
      updateEngineUI();
      updateEvalBar();
    }
  }
  analyzeBtn.addEventListener('click', toggleAnalyze);

  async function analyzeAll() {
    if (allRunning) {
      allCancel = true;
      return;
    }
    if (!parsed || n < 1) return;
    allRunning = true;
    allCancel = false;
    analyzeAllBtn.textContent = 'Cancel';
    try {
      await ensureEngine();
      await engine.stop(); // suspend the main analysis
      for (let p = 1; p <= n; p++) {
        if (allCancel) break;
        const fen = parsed.fens[p];
        const info = await engine.analyse(fen, { depth: 12 });
        if (info?.score) {
          engineEvals[p] = whiteScoreToEv(toWhiteScore(info.score, sideToMoveOf(fen)));
          renderMoves();
        }
      }
    } catch (err) {
      console.error('[engine] analyze-all failed:', err);
    } finally {
      allRunning = false;
      analyzeAllBtn.textContent = 'Analyze all moves';
      if (analyzeOn) scheduleAnalyse(); // resume main on the shown position
    }
  }
  analyzeAllBtn.addEventListener('click', analyzeAll);

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
    renderMoves();

    if (analyzeOn) {
      const fen = parsed.fens[state.ply];
      if (fen !== lastShownFen) {
        lastShownFen = fen;
        currentEval = null; // position changed — await fresh eval
        scheduleAnalyse();
      }
      updateEngineUI();
      updateEvalBar();
    }
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
  const cleanups = [
    () => window.removeEventListener('keydown', onKey),
    () => {
      clearTimeout(analyseTimer);
      if (engine) engine.terminate();
    },
  ];

  if (roundLive) {
    const thinkById = new Map((e.games || []).map((g) => [g.id, g.thinkTime || 0]));
    const live = startLiveRound(roundId, {
      initialThink: (id) => thinkById.get(id) || 0,
      onGame: (id, entry) => {
        if (entry.parsed) {
          patchGameRow(left, id, liveInfo(entry.parsed, entry.lastUpdateAt));
        }
        if (id !== gameId || !entry.parsed) return;
        const wasAtLatest = state.ply === n;
        parsed = entry.parsed;
        n = parsed.fens.length - 1;
        const result = parsed.headers.Result;
        status = result && result !== '*' ? result : '*';
        liveEntry = entry;
        if (wasAtLatest) state.ply = n;
        draw();
      },
    });
    const stopListTick = startClockTicker(left);
    const barTick = setInterval(drawBars, 1000);
    cleanups.push(live.close, stopListTick, () => clearInterval(barTick));
  }

  window.addEventListener('hashchange', () => cleanups.forEach((fn) => fn()), {
    once: true,
  });
}
