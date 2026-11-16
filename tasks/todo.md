# Phase 0 — Setup

- [x] `npm init -y`, `npm i -D vite`, add `dev` / `build` / `preview` scripts
- [x] `.gitignore` (`node_modules/`, `dist/`, `public/engine/`)
- [x] `netlify.toml` (build `npm run build`, publish `dist`)
- [x] `index.html` at root → loads `src/main.js`
- [x] `src/styles/theme.css` — dark theme (§4.1) as CSS variables
- [x] Shell: header (site name + nav Tournaments/About), `<main>`, footer credit
- [x] Hash router in `src/main.js` for all §2 routes
- [x] Empty view stubs: `src/views/{home,tournament,game,about}.js`
- [x] `src/api/lichess.js` — queue, 429 handling, in-memory cache, ndjson reader, endpoints A–E
- [x] TEMP: home view calls A for this month and `console.log`s the tournaments
- [x] `npm run dev` shows dark shell + console lists this month's tournaments from A
- [x] `npm run build` passes
- [x] Review section added

## Review

**What changed (new files):**
- `package.json` — ESM project (`"type": "module"`), Vite dev dep, `dev` / `build` / `preview` scripts.
- `.gitignore`, `netlify.toml` (build `npm run build`, publish `dist`).
- `index.html` — root Vite entry, loads `src/main.js`, `#app` mount point.
- `src/styles/theme.css` — §4.1 dark palette as CSS variables; shell styles (header, nav, main, footer, panel, status banner).
- `src/main.js` — app shell (header + nav + footer credit) and the hash router for all §2 routes (`#/`, `#/t/{tourId}`, `.../{roundId}`, `.../{gameId}`, `#/about`); active-nav highlight; a status banner wired to the API's `onStatus`.
- `src/views/home.js`, `tournament.js`, `game.js`, `about.js` — placeholder views. Home also has the **TEMP** endpoint-A console log (marked `// TEMP — remove in Phase 1`).
- `src/api/lichess.js` — single-request queue, HTTP-429 handling (pause 60 s + one retry, `onStatus` banner), in-memory cache (10 min for A/D), ndjson reader (§3.4), and endpoints **A–E**.

**How to test:**
1. `npm install` then `npm run dev` → open the printed localhost URL.
2. Page is dark, with header (**Chess Live** · Tournaments · About) and the footer credit "Live games via the free Lichess broadcast service".
3. Open the browser console: one line `[Phase 0] 23 tournament(s) from calendar 2026-11:` followed by the named tournaments (endpoint A). No errors.
4. Nav links work: `#/about`, `#/t/xxxx`, `#/t/xxxx/yyyy/zzzz` each render their placeholder; reload keeps the view (shareable URLs).
5. `npm run build` → completes, writes `dist/` (verified: 10 modules, ✓ built).

**Verified this session:** endpoint A returned 23 tournaments for 2026-11 (HTTP 200); shell rendered dark in Chrome; console logged exactly one pass with no errors; `npm run build` passed.

**Notes / decisions:**
- Scoped `lichess.js` to endpoints **A–E** (what the Phase 0 table names). F/G (PGN stream + one-off round PGN) land in Phase 4.
- Set `package.json` `"type": "module"` so ES-module imports work under Node tooling; dropped the `npm init` defaults (`main`, `test`).
- Fixed a first-load double-render: normalise an empty hash with `history.replaceState` (no extra `hashchange`) so the view renders — and endpoint A logs — once.

**Left for later phases:** timeline/dropdown UI (1), flags + tournament page (2), board + game viewer (3), live stream F/G (4), Stockfish analyze (5), mobile/polish/About content (6), ship (7). The TEMP console log in `home.js` is removed in Phase 1.
