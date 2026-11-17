# Phase 3 — Game viewer (§5.4) + green board (§4.3), no live updates

- [x] `npm i chess.js`
- [x] Vendor cburnett pieces → `public/piece/cburnett/*.svg` (12)
- [x] `src/api/lichess.js` — add endpoint G `getRoundPgn(roundId)` (text, queued, cached ~10 min)
- [x] `src/lib/pgn.js` — `splitGames`, `gameIdOf`, `parseGame` (chess.js): sans, fens, lastMove, check, clockWhite/Black, evals
- [x] `src/ui/board.js` — green board; ONE `isLightSquare` (a1 dark, h1 light); pieces, coords, last-move tint, check glow; square/responsive
- [x] `src/ui/playerBar.js` — flag · title · name · rating; right = frozen clock + result box when finished
- [x] `src/ui/moveList.js` — two-column move list, current highlighted, click to jump, eval grey (+0.2 / #n)
- [x] `src/views/game.js` — load E + G, match game; 3-column layout; ply/orientation state; nav ⏮◀▶⏭ ⇅; keyboard ←→ Home End f
- [x] `src/styles/game.css` — 3-column grid, board, player bars, move list, controls; import in `main.js`
- [x] Left game list reused (compact, current highlighted, back → tournament)
- [x] All untrusted text via `textContent` / `createElement`
- [x] `npm run dev` verified in Chrome: a1 dark/h1 light, step-through, flip, last-move, check glow; no console errors
- [x] `npm run build` passes
- [x] Provide a finished game link to compare move-by-move with lichess.org
- [x] Review section added
- [ ] (Phase 6 reminder) credit cburnett pieces on the About page

## Review

**What changed**
- **Dependency:** `chess.js` 1.4.0 (move replay / check detection). **Assets:** 12 cburnett
  SVGs vendored into `public/piece/cburnett/` (GPLv2+ — About credit is a Phase-6 to-do).
- **`src/api/lichess.js`** — added endpoint **G** `getRoundPgn(roundId)` (text, queued,
  cached ~10 min; never polled).
- **New `src/lib/pgn.js`** — splits a round PGN, matches a game by `GameURL`, and parses it
  into per-position arrays (`fens`, `lastMove`, `check` square, `clockWhite/Black`, `evals`,
  `sans`). **We bypass chess.js's own PGN parser** (it rejected Lichess's escaped-quote
  headers *and* some comments) — headers are regex-parsed and moves hand-tokenized, with
  chess.js used only to replay moves. Verified: Afanasiev–Yuan parses to 159 plies with
  correct clocks, evals and check squares.
- **New `src/ui/board.js`** — green board (§4.3). THE single `isLightSquare(file,rank) =
  (file+rank)%2===1`, a1=(0,0): **a1 dark/green, h1 light/white** (confirmed on screen).
  Light #fff; dark #759a60 with the #7ea269→#699054 gradient; 3px #3f5f37 frame; cburnett
  pieces; inner coordinates (ranks top-left, files bottom-right, following the flip, opposite
  colour); last-move tint `rgba(155,199,0,0.41)`; red radial check glow on the king.
- **New `src/ui/playerBar.js`**, **`src/ui/moveList.js`** — player bar (flag·title·name·
  rating + frozen clock + result box) and the two-column move list (current highlight, click
  to jump, `[%eval]` shown as `+0.2` / `#n`).
- **Rewrote `src/views/game.js`** — loads E + G in parallel, matches the game, lays out the
  3 columns (reused `renderGameList` on the left, back → tournament page), tracks ply +
  orientation, wires ⏮◀▶⏭ ⇅ and keyboard ←/→/Home/End/`f` (listener removed on the next
  `hashchange`). Centre eval bar + engine box are Phase 5.
- **New `src/styles/game.css`**; `main.js` imports it.

**Verified in Chrome** (`#/t/3yQeQYED/nJcBDmFE/JT6Xe9HL`): a1 dark / h1 light; final position
and pieces correct; player bars show flags/titles/names/ratings, result (Afanasiev **1** /
Yuan **0**) and frozen clocks; move list with evals (`#20` near the end); ◀ / move-list click
/ `→` / `Home`/`End` navigation; `f` and ⇅ flip (coordinates + sides follow); last-move
highlight and the **red check glow** (e.g. `e4+` → king f5, `Nh3+` → king g5). No console
errors; `npm run build` passes.

**Deliverable — compare move-by-move with lichess.org**
- App: `#/t/3yQeQYED/nJcBDmFE/JT6Xe9HL` (run `npm run dev`, append to the local URL).
- Lichess: `https://lichess.org/broadcast/2nd-belt-and-road-china-international-chess-open-bengbu-anhui-2026-group-a/round-1/nJcBDmFE/JT6Xe9HL`
- GM Afanasiev, Nikita vs Yuan, Qingyu — 1-0, 80 moves, with clocks and evals to check.

**Decisions / notes**
- Player bar shows **both** the frozen per-ply clock and the result box (the move-by-move
  clock check needs the clock visible), matching Lichess's broadcast.
- **Bypassed chess.js loadPgn** (see above) — the manual tokenizer handles broadcast PGNs
  (linear, no variations). If a future PGN has variations/odd SAN, the parser stops at the
  first move it can't replay rather than crashing.
- Minor layout nit on short viewports (~600px tall): the board (max 560px) can push the
  bottom player bar below the fold; fine on normal desktops, can cap board height to the
  viewport in Phase 6.

**Left for later:** live stream F + follow-live + ticking clocks + live evals (Phase 4);
Stockfish Analyze + centre eval bar (Phase 5); mobile layout, About credits (incl. cburnett),
skeleton/error states (Phase 6). Endpoints used this phase: E, G.
