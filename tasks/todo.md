# Phase 2 — Tournament page (§5.3) + round picker + game list + flags (§4.4)

- [x] `npm i flag-icons`; import its CSS in `main.js`
- [x] Copy `docs/fide-feds.json` → `src/data/fide-feds.json`
- [x] `src/ui/flag.js` — `makeFlag(fed)`: flag span / FID globe / 3-letter grey box; tooltip = country; no innerHTML
- [x] `src/lib/time.js` — `formatClock(centis)`, `formatDateTime(ms)`, `formatDate(ms)`, `formatDateRange(dates)` (local)
- [x] `src/ui/gameList.js` — header bar (‹ back, round name, 🔍 filter), rows (eval bar, flag·title·name ×2, result/clock), click → game route, empty-round message
- [x] `src/views/tournament.js` — load D, choose round, render header + info line + links
- [x] Round picker pills: ✓ finished / ● live / upcoming date / "after previous round"; active pill; link to round URL
- [x] Load E for chosen round → render game list (backHref `#/`); redraw on roundId change
- [x] `src/styles/tournament.css` — header, pills, rows, flags, eval bar, result colours; import in `main.js`
- [x] All untrusted text via `textContent` / `createElement`
- [x] `npm run dev` verified in Chrome: finished results, live clocks, upcoming time, flags, filter, click-through; no console errors
- [x] `npm run build` passes
- [x] Provide finished / live / upcoming round links to test
- [x] Review section added

## Review

**What changed**
- **Dependency:** `flag-icons` 7.6.0; CSS imported in `src/main.js`. `docs/fide-feds.json`
  copied to `src/data/fide-feds.json`.
- **New `src/lib/time.js`** — `formatClock(centis)` (`h:mm:ss`/`mm:ss`, never < 0),
  `formatDateTime`/`formatDate`/`formatDateRange` (visitor-local). Reused by Phases 3–4.
- **New `src/ui/flag.js`** — `makeFlag(fed)`: flag-icons span with country tooltip; `FID`
  → globe; `AHO`/`TPE`/unknown → 3-letter grey box. All via `textContent`.
- **New `src/ui/gameList.js`** — Lichess-style list from endpoint E. Header bar (‹ back,
  round name, 🔍 filter), one row per board: mini eval bar (neutral 50%), White/Black lines
  of flag · gold title · name, and per-player result (`1`/`0`/`½` in §4.1 colours) when
  finished / clock when in progress / empty when not started. Row = link to the game route.
  Empty round → "Pairings not published yet · starts {local time}".
- **Rewrote `src/views/tournament.js`** — loads D (`getTournament`), builds the header
  (name, `format · tc · location · dates`, Official-site/Standings links gated to http(s),
  `rel="noopener noreferrer"`), the round picker (pill per round: ✓ finished / red ● live /
  local date when upcoming / "after previous round"; active pill scrolled into view, round
  chosen by URL → defaultRoundId → ongoing → last finished → first), then loads E
  (`getRound`) for the chosen round and renders the game list.
- **New `src/styles/tournament.css`**; `main.js` imports flag-icons CSS + both new sheets.

**Fix during verification:** the 🔍 player filter didn't hide rows — `.gl-row { display:
flex }` was overriding the browser's `[hidden] { display: none }`. Added `.gl-row[hidden] {
display: none }`. Filter now works.

**How to test** — `npm run dev`, then open the three links below. Finished round shows
`1`/`0`/`½`; live round shows per-player clocks and a red ● pill; upcoming round shows
"Pairings not published yet …". 🔍 filters rows by player name; a row click opens the
game route (`#/t/{tour}/{round}/{game}`, Phase-3 placeholder); "‹" returns to the timeline.
`npm run build` passes; no app console errors.

**Test links — "2nd Belt and Road China Int'l Chess Open 2026 Group A" (`3yQeQYED`):**
- Finished (Round 1, results): `#/t/3yQeQYED/nJcBDmFE`
- Live (Round 2, clocks + ● pill): `#/t/3yQeQYED/gB345vel`
- Upcoming (Round 3, pairings message): `#/t/3yQeQYED/VSiTo8l4`
(These are live Lichess rounds — states may advance over time. The tournament page is at
`#/t/3yQeQYED`.)

**Decisions / deferrals**
- Clocks are a **static snapshot** from E (meets "a live round shows clocks"); the ticking
  side-to-move countdown (§5.4) lands in **Phase 4** with the stream.
- Mini eval bars are **neutral 50%** — no PGN/eval source until the stream (Phase 4).
- flag-icons inlines many flags → the built CSS is ~429 KB (87 KB gzip). Acceptable; can be
  trimmed in Phase 6 if desired. (A brief white flash on first cold load is **dev-only** —
  Vite injects CSS via JS in dev; the production build uses a render-blocking `<link>`.)

**Left for later:** game viewer/board (Phase 3); live stream F + ticking clocks + live evals
(Phase 4); mobile/empty/error polish (Phase 6). Endpoints used this phase: D, E.
