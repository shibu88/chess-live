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
