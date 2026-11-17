// Live round controller (SPEC §3.3, §3.4). Opens the round PGN stream (F),
// parses each game block, keeps a per-game live snapshot, and notifies the view.
// Shared by the tournament page and the game viewer.
import { streamRoundPgn, getRound } from '../api/lichess.js';
import { parseGame, gameIdOf } from '../lib/pgn.js';

/** Side to move ('white'|'black') from a FEN. */
export function sideToMoveOf(fen) {
  return fen && fen.split(' ')[1] === 'b' ? 'black' : 'white';
}

/** Build the game-list patch payload from a parsed game + its update time. */
export function liveInfo(parsed, lastUpdateAt) {
  const n = parsed.fens.length - 1;
  let ev = null;
  for (let i = n; i >= 0; i--) {
    if (parsed.evals[i] != null) {
      ev = parsed.evals[i];
      break;
    }
  }
  const result = parsed.headers.Result;
  return {
    status: result && result !== '*' ? result : '*',
    clockWhite: parsed.clockWhite[n],
    clockBlack: parsed.clockBlack[n],
    sideToMove: sideToMoveOf(parsed.fens[n]),
    lastUpdateAt,
    eval: ev,
  };
}

/**
 * startLiveRound(roundId, { onGame, onStatus, initialThink })
 * - onGame(gameId, entry): entry = { parsed, ply, lastUpdateAt }
 * - onStatus('connected' | 'reconnecting'): optional
 * - initialThink(gameId): seconds since the last move at first sighting (from E's
 *   thinkTime), so the clock counts down from the right offset. Optional.
 * Returns { games: Map, close() }.
 */
export function startLiveRound(roundId, { onGame, onStatus, initialThink } = {}) {
  const games = new Map(); // gameId -> { parsed, ply, lastUpdateAt }
  let connected = false;
  let fallbackTimer = null;

  // E-refresh fallback (§3.3): if the stream can't connect, poll E every 30 s
  // until it does, so a live round still updates (coarsely).
  function startFallback() {
    if (fallbackTimer) return;
    fallbackTimer = setInterval(async () => {
      try {
        const e = await getRound(roundId);
        // We only have E's snapshot here (no PGN moves); surface game status/
        // clocks so rows can at least refresh results. The stream, once back,
        // supersedes this.
        for (const g of e.games || []) {
          const prev = games.get(g.id);
          onGame?.(g.id, prev || { parsed: null, lastUpdateAt: Date.now(), eGame: g });
        }
      } catch {
        /* keep trying */
      }
    }, 30000);
  }
  function stopFallback() {
    if (fallbackTimer) {
      clearInterval(fallbackTimer);
      fallbackTimer = null;
    }
  }

  const stream = streamRoundPgn(roundId, {
    onGame(block) {
      const id = gameIdOf(block);
      if (!id) return;
      let parsed;
      try {
        parsed = parseGame(block);
      } catch {
        return; // skip an unparseable block
      }
      const ply = parsed.fens.length - 1;
      const prev = games.get(id);
      let lastUpdateAt;
      if (!prev) {
        const think = initialThink?.(id) ?? 0; // seconds since last move at load
        lastUpdateAt = Date.now() - think * 1000;
      } else if (ply <= prev.ply) {
        lastUpdateAt = prev.lastUpdateAt; // re-send of the same position
      } else {
        lastUpdateAt = Date.now(); // a new move just arrived
      }
      const entry = { parsed, ply, lastUpdateAt };
      games.set(id, entry);
      onGame?.(id, entry);
    },
    onConnect() {
      connected = true;
      stopFallback();
      onStatus?.('connected');
    },
    onDrop() {
      onStatus?.('reconnecting');
      if (!connected) startFallback(); // never connected yet → poll E meanwhile
    },
  });

  return {
    games,
    close() {
      stopFallback();
      stream.close();
    },
  };
}
