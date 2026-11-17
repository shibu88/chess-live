// Evaluation → White's winning share, for eval bars (SPEC §5.5 curve).
// Shared by the game-list mini eval bar (Phase 4) and the viewer eval bar (Phase 5).

/**
 * ev: a number in pawns (White's POV), or { mate }, or null.
 * Returns White's share 0..100. null → 50 (neutral).
 */
export function evalToWhitePct(ev) {
  if (ev == null) return 50;
  if (typeof ev === 'object' && 'mate' in ev) {
    if (ev.mate === 0) return 50;
    return ev.mate > 0 ? 100 : 0;
  }
  const cp = Math.max(-1000, Math.min(1000, Number(ev) * 100));
  const pct = 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1);
  return Math.max(0, Math.min(100, pct));
}

/**
 * Engine scores are from the side to move. Flip to White's POV.
 * score: { type: 'cp'|'mate', value }. Returns a new score object.
 */
export function toWhiteScore(score, sideToMove) {
  if (!score) return null;
  const sign = sideToMove === 'black' ? -1 : 1;
  return { type: score.type, value: score.value * sign };
}

/**
 * Format a White-POV score for the engine box (SPEC §5.5):
 * cp → `+0.84` / `-0.84` / `0.00`; mate → `#3` (White) / `#-3` (Black).
 */
export function formatEval(whiteScore) {
  if (!whiteScore) return '…';
  if (whiteScore.type === 'mate') return `#${whiteScore.value}`;
  const v = whiteScore.value;
  if (v === 0) return '0.00';
  return (v > 0 ? '+' : '') + (v / 100).toFixed(2);
}

/** A White-POV engine score → the pawns/{mate} form `evalToWhitePct` expects. */
export function whiteScoreToEv(whiteScore) {
  if (!whiteScore) return null;
  return whiteScore.type === 'mate' ? { mate: whiteScore.value } : whiteScore.value / 100;
}
