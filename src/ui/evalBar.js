// Vertical eval bar along the board's left edge (SPEC §5.4/§5.5). Shown only
// while Analyze is on. White's share fills from White's side (follows the flip).
import { evalToWhitePct, whiteScoreToEv } from '../lib/eval.js';

/**
 * renderEvalBar(container, whiteScore, orientation)
 * - whiteScore: { type, value } from White's POV, or null (→ 50%).
 * - orientation: 'white' | 'black' (board flip).
 */
export function renderEvalBar(container, whiteScore, orientation) {
  const pct = whiteScore == null ? 50 : evalToWhitePct(whiteScoreToEv(whiteScore));
  const bar = document.createElement('div');
  bar.className = 'eval-bar';
  const fill = document.createElement('div');
  fill.className = 'eval-fill';
  fill.style.height = pct + '%';
  // White sits at the bottom normally, at the top when flipped.
  if (orientation === 'black') {
    fill.style.top = '0';
    fill.style.bottom = 'auto';
  } else {
    fill.style.bottom = '0';
    fill.style.top = 'auto';
  }
  bar.append(fill);
  container.replaceChildren(bar);
}
