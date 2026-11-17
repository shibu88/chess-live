# Phase 6 — Polish: mobile, skeletons, empty/error states, About, titles, favicon (§7)

- [x] `public/favicon.svg` + `<link rel="icon">` + `theme-color` meta in `index.html`
- [x] `src/ui/states.js` — `skeleton`, `emptyState`, `errorState(text, onRetry)`
- [x] `src/styles/states.css` — shimmer, empty/error, narrow gutter; import in `main.js`
- [x] `src/main.js` — `document.title` per route (views refine with real names)
- [x] `src/views/about.js` — Lichess credit, broadcast-delay note, Stockfish GPLv3 + source link, cburnett credit
- [x] `src/views/home.js` — timeline skeleton; error (retry) if all loads fail; empty state
- [x] `src/views/tournament.js` — skeleton; errorState(retry); title = tour name
- [x] `src/views/game.js` — skeleton; errorState; title = "White – Black"
- [x] Mobile <900px: game viewer stacks per §5.4 (bars·board·bars·engine·moves·game list), board fills width
- [x] Mobile: home/tournament gutters, panel-head wraps, header fits at 375px
- [x] 429 "Lichess is busy" banner verified (already wired)
- [x] `npm run dev` + Chrome: error state, titles, favicon, skeletons, no app console errors
- [x] `npm run build` passes
- [x] List remaining rough edges
- [x] Review section added

## Review

**What changed**
- **New `public/favicon.svg`** (green/white 2×2 board on a dark square) + `<link rel="icon">`
  and `theme-color` in `index.html`.
- **New `src/ui/states.js`** / **`src/styles/states.css`** — shared `skeleton` (shimmer),
  `emptyState`, `errorState(text, onRetry)` + a narrow-width gutter.
- **`src/main.js`** — per-route `document.title` (home → "Chess Live", about → "About · Chess
  Live", tournament/game default, then refined); imports `states.css`.
- **`src/views/about.js`** — full About: **Lichess broadcast API** credit, **broadcast-delay**
  note (§3.5), **Stockfish 19 GPLv3** + source link + bundled `Copying.txt`, **cburnett**
  pieces (GPLv2+). All external links `rel="noopener noreferrer"`.
- **`src/views/home.js`** — timeline skeleton; `errorState(retry)` if every A month and B
  fail; `emptyState` if nothing to show.
- **`src/views/tournament.js`** — refactored to `loadTournament`/`loadRound` with skeletons
  and `errorState(retry)` for both D and E; sets the title to the tournament name.
- **`src/views/game.js`** — skeleton while E+G load, `errorState(retry)` on failure, title =
  "White – Black · Chess Live".
- **`game.css` / `theme.css` / `home.css`** — mobile media queries: game viewer stacks
  single-column in the §5.4 order (board+bars · engine+moves · game list), board full width;
  tighter header/gutter at ≤600px; `.panel-head` wraps.

**Verified in Chrome (desktop capture):** About page (4 credits, links, title "About · Chess
Live"); a bad id (`#/t/zzzzzzzz`) → "Could not load this tournament." + Try again; the game
skeleton then the full viewer with title "Afanasiev, Nikita – Yuan, Qingyu · Chess Live"; the
favicon served. The compiled `@media (max-width:900px)` rule is correct (game-view flex
column; gv-center/right/left order 1/2/3; board 100% width). `npm run build` passes; no app
console errors (the "message channel closed" lines are Chrome-extension noise; the single
`[tournament] … 404` log is the intentional error path from the bad-id test).

**Still rough (reported to the user):**
1. **375px not visually confirmed** — the browser automation renders/captures at ~1500px and
   `resize_window` didn't shrink the rendering viewport, so mobile was verified by inspecting
   the compiled CSS rules, not a real 375px screenshot. Eyeball on a phone / DevTools device
   mode before shipping.
2. **Board height on short viewports** (pre-existing) — the 560px board can push the bottom
   player bar below the fold on short windows; could cap board height to the viewport.
3. **"All official" timeline stale-date outlier** (Phase 1) — one tour with a 2025 date
   stretches the axis back; could clamp stale dates.
4. **flag-icons CSS ~428 KB** — inlines many flags; could be trimmed to only used flags.
5. **Eval-bar offset** — when Analyze is on, the board shifts right by the eval-bar width
   while the player bars stay centered (minor alignment nit).
6. Skeletons are generic shimmer blocks, not pixel-perfect clones of each view (by design).

**Left for later:** Phase 7 — security check, push to GitHub, deploy to Netlify.
