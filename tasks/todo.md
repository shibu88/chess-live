# Phase 5 — Analyze: Stockfish 19 lite in the browser (§5.5)

- [x] `npm i -D stockfish@19`; add `copy-engine` + `postinstall` scripts
- [x] `scripts/copy-engine.js` — copy engine .js/.wasm/Copying.txt → `public/engine/`
- [x] `src/engine/engine.js` — Worker wrapper: `init`, `analyse(fen,{depth})`, `stop`, `onInfo`, `terminate`
- [x] `src/lib/eval.js` — `toWhiteScore` + `formatEval` (+0.84 / -0.84 / 0.00 / #3 / #-3) + `whiteScoreToEv`
- [x] `src/ui/evalBar.js` — thin vertical eval bar (White's share, follows flip)
- [x] `src/views/game.js` — engine box (Analyze toggle, eval text, "Stockfish 19 lite · depth 22", best line SAN); centre eval bar; re-analyse on fen change (debounce 150ms); terminate on leave
- [x] Analyze all moves (last): depth-12 sequential pass, fills move-list evals, cancelable, pauses main
- [x] `src/styles/game.css` — engine box, Analyze button, eval text, eval bar
- [x] No CSP added (none exists); worker served from `public/engine/`
- [x] Verify the two §7 positions: start ≈ +0.2..+0.4; mate FEN → #1 / Qxf7#
- [x] `npm run dev` + Chrome: toggle, re-analyse on step, eval bar, best line, no console errors
- [x] `npm run build` passes
- [x] Report both position results
- [x] Review section added
- [ ] (Phase 6 reminder) About: Stockfish GPL + source link, cburnett credit, broadcast-delay note

## Review

**What changed**
- **`package.json`** — `stockfish@19.0.1` as a **devDependency** (the browser loads the
  static worker from `public/engine/`; not bundled). Scripts `copy-engine` and
  **`postinstall`** (verified: a full `npm install` recreates `public/engine/`, Netlify-safe).
- **New `scripts/copy-engine.js`** — ESM; copies `stockfish-19-lite-single.{js,wasm}` +
  `Copying.txt` from `node_modules/stockfish/` into `public/engine/` (git-ignored). Adapted
  from the user's chess-hub `copy-engine.mjs`.
- **New `src/engine/engine.js`** — Stockfish over one Web Worker, adapted from chess-hub's
  wrapper: `init()` (uci→uciok→isready→readyok→ucinewgame, normalizes string/`{data}`
  messages), `analyse(fen,{depth=22})` (serializes: stops a running search, awaits bestmove,
  then `position`+`go depth`; streams parsed info; resolves with the final score on
  bestmove), `stop()`, `onInfo(cb)`, `terminate()`.
- **`src/lib/eval.js`** — `toWhiteScore` (flip side-to-move score to White's POV),
  `formatEval` (`+0.84`/`-0.84`/`0.00`, mate `#3`/`#-3`), `whiteScoreToEv` (→ the pawns/
  `{mate}` form the bar curve wants). Reuses the Phase-4 `evalToWhitePct`.
- **`src/lib/pgn.js`** — `pvToSan(fen, pvUci, 8)` replays the UCI PV with chess.js → numbered
  SAN for the best line.
- **New `src/ui/evalBar.js`** — the thin vertical eval bar (White's share; fills from White's
  side, follows the board flip).
- **`src/views/game.js`** — engine box above the move list (Analyze toggle, big eval text,
  `Stockfish 19 lite · depth D`, best line) + the centre eval bar to the board's left.
  Lazy-inits the engine on first Analyze-on, analyses `parsed.fens[state.ply]`, re-analyses
  on fen change (debounce 150 ms; the engine stops the prior search), ignores stale info,
  hides the bar / stops the search on Analyze-off, and terminates the worker on route change.
  **Analyze all moves** walks every position at depth 12, writing engine evals the move list
  prefers over PGN evals; cancelable; suspends the main analysis and resumes after.
- **`src/styles/game.css`** — engine box, Analyze button (on = green), eval text, best line,
  the board-row + eval bar.

**Verified — the two §7 Phase-5 positions** (engine driven directly, then in the app):
- **Start position** `rnbqkbnr/…w KQkq - 0 1` → **+0.26** at depth 22, best **e2e4**
  (pv `e4 e5 Nf3 Nc6`) — within the expected **+0.2 to +0.4**. In the app the start position
  showed **+0.34 / +0.30** with best line `1. e4 e6 2. d4 d5 …` and the bar just above half.
- **Mate position** `r1bqkbnr/ppp2ppp/2np4/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 0 4` →
  **#1**, best **f3f7 = Qxf7#**. ✓

**Also verified in Chrome:** Analyze toggle; final position of the test game showed **+8.49**
(White winning) with a near-full-white eval bar and a correct best line; stepping re-analyses
(eval/bar/line update); Analyze off hides the bar and clears the box; **Analyze all moves**
filled every move's eval (depth 12, e.g. `4. cxd5 +0.3 exd5 +0.4`). No app console errors
(the "message channel closed" lines are Chrome-extension noise). `npm run build` passes.

**Notes / decisions**
- One worker, lazy on first Analyze-on, kept while on the viewer, terminated on route change;
  Analyze-off only stops the search.
- No CSP exists, so the WASM worker runs as-is. If a CSP is ever added it must allow
  `script-src 'self' 'wasm-unsafe-eval'` and `connect-src https://lichess.org` (CLAUDE.md).
- A throwaway `_enginetest.html` was used to verify the two FENs headlessly; it was deleted.

**Left for later:** mobile layout; **About page** (Stockfish GPL + source link, cburnett
piece credit, broadcast-delay note) — Phase 6; ship — Phase 7. `public/engine/` stays
git-ignored and is recreated by `postinstall` on every install.
