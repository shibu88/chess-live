// PGN parsing for broadcast rounds (endpoint G).
// A round PGN concatenates many games; we split, match by GameURL, and replay
// each game into per-ply positions with clocks, evals, last-move and check.
//
// We parse headers + tokenize moves ourselves (broadcast PGNs are linear — no
// variations or NAGs) and use chess.js only to replay moves. chess.js's own PGN
// parser is avoided: it rejects Lichess's escaped-quote headers and some comments.
import { Chess } from 'chess.js';

/** Split a round PGN into per-game text blocks. */
export function splitGames(text) {
  const norm = (text || '').replace(/\r\n/g, '\n');
  return norm
    .split(/\n(?=\[Event )/)
    .map((b) => b.trim())
    .filter(Boolean);
}

/** The game id = last path segment of the GameURL (or Site) header. */
export function gameIdOf(block) {
  const m =
    block.match(/\[GameURL\s+"([^"]+)"\]/) || block.match(/\[Site\s+"([^"]+)"\]/);
  if (!m) return null;
  return m[1].split('/').filter(Boolean).pop() || null;
}

function parseHeaders(block) {
  const h = {};
  const re = /\[(\w+)\s+"((?:[^"\\]|\\.)*)"\]/g;
  let m;
  while ((m = re.exec(block))) {
    h[m[1]] = m[2].replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  }
  return h;
}

// Tokenize the move section into [{ san, comment }], stripping move numbers,
// results, NAGs. Comments ({...}) attach to the preceding move.
function tokenizeMoves(moveText) {
  const out = [];
  let i = 0;
  const s = moveText;
  while (i < s.length) {
    const ch = s[i];
    if (ch === '{') {
      const end = s.indexOf('}', i);
      const comment = s.slice(i + 1, end < 0 ? s.length : end);
      if (out.length) out[out.length - 1].comment += ' ' + comment;
      i = end < 0 ? s.length : end + 1;
    } else if (/\s/.test(ch)) {
      i++;
    } else {
      let j = i;
      while (j < s.length && !/\s/.test(s[j]) && s[j] !== '{') j++;
      let tok = s.slice(i, j);
      i = j;
      tok = tok.replace(/^\d+\.(\.\.)?/, ''); // leading move number "12." / "12..."
      if (!tok || tok === '*') continue;
      if (tok === '1-0' || tok === '0-1' || tok === '1/2-1/2') continue;
      if (/^\$\d+$/.test(tok)) continue; // NAG
      out.push({ san: tok, comment: '' });
    }
  }
  return out;
}

function parseClk(comment) {
  const m = comment.match(/\[%clk\s+([\d:.]+)\]/);
  if (!m) return null;
  let s = 0;
  for (const p of m[1].split(':').map(Number)) s = s * 60 + p; // h:m:s / m:s
  return Math.round(s * 100); // centiseconds
}

function parseEval(comment) {
  const m = comment.match(/\[%eval\s+(#?-?\d+(?:\.\d+)?)\]/);
  if (!m) return null;
  const raw = m[1];
  if (raw.startsWith('#')) return { mate: parseInt(raw.slice(1), 10) };
  return Number(raw); // pawns, from White's point of view
}

// TimeControl base → centiseconds (for the pre-move-1 clock display only).
function baseCentis(tc) {
  if (!tc) return null;
  const m = tc.match(/^(\d+)/);
  if (!m) return null;
  let sec = Number(m[1]);
  if (sec <= 180) sec *= 60; // "90+30" means 90 minutes on Lichess broadcasts
  return sec * 100;
}

function kingSquare(chess, color) {
  for (const row of chess.board()) {
    for (const cell of row) {
      if (cell && cell.type === 'k' && cell.color === color) return cell.square;
    }
  }
  return null;
}

/**
 * Parse one game block → per-position arrays (0 = start, p = after ply p):
 * { headers, sans, fens, lastMove, check, clockWhite, clockBlack, evals }.
 */
export function parseGame(block) {
  const headers = parseHeaders(block);
  const parts = block.split(/\n\s*\n/);
  const moveText = parts.slice(1).join('\n') || '';
  const tokens = tokenizeMoves(moveText);

  const chess = headers.FEN ? new Chess(headers.FEN) : new Chess();
  const fens = [chess.fen()];
  const sans = [];
  const lastMove = [null];
  const check = [null];
  const clkRaw = [null];
  const evals = [null];

  for (const { san, comment } of tokens) {
    let mv;
    try {
      mv = chess.move(san);
    } catch {
      break; // unparseable move — stop at what we have
    }
    sans.push(mv.san);
    fens.push(chess.fen());
    lastMove.push({ from: mv.from, to: mv.to });
    check.push(chess.isCheck() ? kingSquare(chess, chess.turn()) : null);
    clkRaw.push(parseClk(comment));
    evals.push(parseEval(comment));
  }

  // Each side's clock at each position (carry forward). The clk at position p
  // belongs to whoever just moved: p odd → White, even(>0) → Black.
  const base = baseCentis(headers.TimeControl);
  const len = fens.length;
  const clockWhite = new Array(len).fill(null);
  const clockBlack = new Array(len).fill(null);
  let w = base;
  let b = base;
  for (let p = 0; p < len; p++) {
    if (p > 0) {
      if (p % 2 === 1 && clkRaw[p] != null) w = clkRaw[p];
      if (p % 2 === 0 && clkRaw[p] != null) b = clkRaw[p];
    }
    clockWhite[p] = w;
    clockBlack[p] = b;
  }

  return { headers, sans, fens, lastMove, check, clockWhite, clockBlack, evals };
}

/** Find and parse the game whose GameURL matches `gameId`, else null. */
export function parseRoundGame(pgnText, gameId) {
  for (const block of splitGames(pgnText)) {
    if (gameIdOf(block) === gameId) return parseGame(block);
  }
  return null;
}
