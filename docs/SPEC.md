# Chess Live — Spec

API details checked on 16 Nov 2026 against Lichess's official API spec (github.com/lichess-org/api) and its server code (github.com/lichess-org/lila).

## 1. What we're building
A static website that follows over-the-board chess tournaments broadcast on Lichess:
1. A timeline (horizontal bar chart, like a Gantt chart) of tournaments — past, live, upcoming.
2. A dropdown to pick a tournament.
3. A tournament page: its rounds (past / live / upcoming) and the games of a round as a clickable list, styled like Lichess's broadcast game list.
4. A game viewer laid out like Lichess's broadcast page: game list on the left, board with player bars in the middle, engine + moves on the right. The board is green (§4.3).
5. An **Analyze** button: Stockfish runs in the browser and shows the evaluation (`+0.84`, `-0.84`, `#3`) of the position on the board.

## 2. Routes (hash)
| Route | Page |
|---|---|
| `#/` | Timeline + tournament dropdown |
| `#/t/{tourId}` | Tournament page, default round |
| `#/t/{tourId}/{roundId}` | Tournament page, that round |
| `#/t/{tourId}/{roundId}/{gameId}` | Game viewer |
| `#/about` | Credits and licences |

IDs are Lichess's 8-character IDs. Every URL must be shareable (reload = same view).

## 3. Lichess API
Base URL `https://lichess.org`. No login, no key. Every path starting with `/api/` sends `Access-Control-Allow-Origin: *`, so `fetch()` from the browser works. Paths without `/api/` (e.g. `/broadcast/{id}/players`) have no CORS — don't use them.

### 3.1 Endpoints we use
| # | Purpose | Request | Response |
|---|---|---|---|
| A | Timeline, one month | `GET /api/broadcast/calendar/{year}/{month}?tiers=best,high` | JSON array of `{ tour, round, group? }`: official tournaments whose **first** round starts in that month (`round` = that first round). `tiers` is optional, a comma list of `normal`, `high`, `best`; leave it out for all official ones. Lichess caches it for 1 hour. ⚠ Not in the official API docs yet (the route exists in Lichess's server code) — if it errors, fall back to B. |
| B | Live, scheduled and recent | `GET /api/broadcast?nb=100` | **ndjson** (one JSON object per line): `{ tour, rounds[], group?, defaultRoundId? }`. First every *active* tournament (a round scheduled or ongoing), sorted by tier, then finished ones, most recent first. Add `&live=true` for only those with a round being played right now. |
| C | Search | `GET /api/broadcast/search?q={text}&page=1` | `{ currentPage, maxPerPage, currentPageResults: [{ tour, round }], previousPage, nextPage }` |
| D | One tournament | `GET /api/broadcast/{tourId}` | `{ tour, rounds[], defaultRoundId?, group? }` |
| E | One round with its games | `GET /api/broadcast/-/-/{roundId}` | `{ round, tour, study, games[], photos }` (the two slugs can be `-`) |
| F | Live stream of a round | `GET /api/stream/broadcast/round/{roundId}.pgn` | Long-lived text stream: first the PGN of every game in the round, then the **whole** PGN of a game every time it changes (new move, result, game added). |
| G | Round PGN, one-off | `GET /api/broadcast/round/{roundId}.pgn` | All games of the round as PGN. Fine for finished rounds; never poll it. |

F and G include clock comments `{ [%clk 1:29:58] }` by default, and `{ [%eval 0.23] }` when available.

### 3.2 Shapes (only the fields we use)
- **tour** `{ id, name, slug, url, tier?, dates?, info?, image?, description? }`
  - `tier`: 3 = normal, 4 = high, 5 = best (official tournaments only)
  - `dates`: `[start]` or `[start, end]`, ms timestamps. start = first round's start; end = the LAST round's START (not its finish). Single-day events have only `[start]`.
  - `info`: `{ format?, tc?, fideTC?, timeZone?, location?, players?, website?, standings? }`
- **round** `{ id, name, slug, url, startsAt?, startsAfterPrevious?, ongoing?, finishedAt?, rated? }`
  - `ongoing`: true while being played · `finishedAt`: set once finished
  - `startsAfterPrevious`: true = no fixed time, starts when the previous round ends
- **game** (from E) `{ id, name, fen?, players?, lastMove?, check?, thinkTime?, status? }`
  - `fen`: MISSING when the game is still at the starting position
  - `players`: `[white, black]`, each `{ name, title?, rating?, fideId?, fed?, clock? }` — `fed` = FIDE federation code, e.g. "KAZ", "FID"; `clock` = time left in CENTISECONDS
  - `lastMove`: UCI, e.g. "e2e4" · `check`: "+" or "#"
  - `thinkTime`: seconds since the last move (only while the game is unfinished)
  - `status`: "*" (ongoing or not started), "1-0", "0-1", "½-½"

PGN headers (F, G) include `White`, `Black`, `Result`, `WhiteFideId`, `BlackFideId` and `GameURL` (`…/{roundId}/{gameId}`). Match a streamed PGN to its game by the last part of `GameURL` (= `game.id` from E). Take names, titles, ratings and federations from E, not from the PGN.

### 3.3 Rate limits and caching
Lichess's rule: one request at a time; after an HTTP 429, wait at least a minute.
- `src/api/lichess.js` keeps a queue so only one normal request is in flight. The stream (F) is separate, and only ONE stream may be open at a time.
- On 429: pause the queue for 60 s, then retry once. Show "Lichess is busy — retrying in 60 s".
- Cache in memory: calendar months and tournament JSON for 10 minutes; round JSON until the route changes.
- Stream: close it (AbortController) when leaving the round or switching rounds. If it drops while the round is still `ongoing`, reconnect after 5 s, then 15 s, then every 60 s.
- No polling. One exception: if a round is live but the stream can't connect, refresh E every 30 s until it can.

### 3.4 Reading ndjson (B) and the PGN stream (F)
- Both: `fetch()` → `res.body.pipeThrough(new TextDecoderStream()).getReader()`, append each chunk to a string buffer.
- ndjson: split the buffer on `\n`, `JSON.parse` each complete non-empty line, keep the last partial line in the buffer.
- PGN stream: each game's PGN starts with `[Event ` and ends with two blank lines. Split on `\n\n\n`, keep the trailing piece in the buffer until more text arrives, then parse each complete piece with chess.js `loadPgn`. When nothing changes, Lichess sends a single space every 60 s to keep the connection open — trim pieces and skip empty ones. If the round hasn't started yet, the stream stays quiet until the first move.
- chess.js keeps the comments: `getComments()` returns `[{ fen, comment }]`; read `[%clk h:mm:ss]` and `[%eval x]` from them.

### 3.5 Broadcast delay
Many top events publish moves with a delay set by the organiser (anti-cheating). The site shows moves when Lichess gets them. Say so on the About page.

## 4. Look
### 4.1 Theme — dark, like Lichess
- page `#161512` · panels `#262421` · panel headers / hover `#3a3733` · borders `#404040` · text `#bababa` · bright text `#e8e8e8`
- titles (GM, IM, FM, WGM…) `#bf811d`, bold · result "1" `#629924` · "0" `#cc3333` · "½" `#8a8a8a`
- System UI font stack, 4px corners.

### 4.2 Timeline colours
grid lines `#454547` · past `#52525b` · live `#dc2626` · upcoming `#3b82f6` · expected = `#3b82f6` diagonal stripes · active nav pill `#4a315a`

### 4.3 Board
- Light squares `#ffffff`. Dark squares `#759a60` with a soft gradient `#7ea269` → `#699054` (top-left → bottom-right). Frame 3px `#3f5f37`.
- Coordinates inside the board: rank numbers in the top-left corner of the left-most file, file letters in the bottom-right corner of the bottom rank (they follow the flip). Text in the opposite square colour.
- **Square colours follow real chess: a1 is dark (green), h1 is light (white).** `isLight = (file + rank) % 2 === 1` with a1 = (0, 0). Keep this in ONE function. (My Chess Hub board has the colours swapped — don't copy that.)
- Last move: from/to squares tinted `rgba(155, 199, 0, 0.41)`. Check: red radial glow on the king's square.
- Pieces: if I've given you my Chess Hub folder (`/add-dir`), reuse its piece images. Otherwise use the cburnett set (GPLv2+, credit on About).
- The board stays square and resizes with the window (max about 560px on desktop).

### 4.4 Flags
- `flag-icons` CSS: `<span class="fi fi-kz"></span>`. Copy `docs/fide-feds.json` to `src/data/` and map `fed` → `flag`.
- `flag: null`: for `FID` (players under the FIDE flag) show a small globe icon, like Lichess does; for any other code show the 3 letters in a small grey box.
- Tooltip (`title`) = country name.

## 5. Features
### 5.1 Timeline — `#/`
- Panel header: collapse arrow, title "Top tournaments", filter `<select>`: Top tier only → `tiers=best` · Top + high → `tiers=best,high` (default) · All official → no `tiers`. Legend on the right: Past · Live · Upcoming · Expected.
- Data: call A for (this month − 2) … (this month + 2) — five calls, one after another, drawing bars as each month arrives — merge and de-duplicate by `tour.id`. Then call B (`nb=100`) to learn which tournaments are live and to get their rounds.
- Bar: from `dates[0]` to (`dates[1]` ?? `dates[0]`) + 1 day.
- Colour:
  - **Live** (red): started, and not finished — if the tournament is in B, not every round has `finishedAt`; otherwise `now` is inside the bar. Put a small pulsing dot before the name when a round is `ongoing` right now.
  - **Past** (grey): finished / bar ended before `now`.
  - **Upcoming** (blue): starts after `now`.
  - **Expected** (blue stripes): upcoming, and in B some rounds have `startsAfterPrevious` or no `startsAt` — extend the bar 1 day per such round, striped.
- Layout: x axis = days. Month labels on top (`Sep 2025`, `Oct`, `Nov`, `Dec`, `Jan 2026` — the year on the first label and on every January). Thin vertical line at each month start, brighter at a new year. A "today" line.
- Rows: sort by start; put each bar in the first row where it (and its label) doesn't overlap. Label = tournament name above the bar, small bold text, cut with "…" if too long (full name in `title`). Tier-5 names brighter.
- Horizontal scroll with a scrollbar under the chart. On load, scroll so today sits in the right third.
- Click a bar or its label → `#/t/{tourId}`.
- Remember collapsed/expanded and the filter in `localStorage` (wrap in try/catch).

### 5.2 Tournament dropdown — under the timeline
- `<select>` with `<optgroup>`s "Live now", "Upcoming", "Finished". Option text: name (+ " · " + `info.location` when present). Built from the timeline data plus B.
- A search box beside it (3+ characters, 400 ms debounce) using C; results in a small list under it.
- Choosing a tournament → `#/t/{tourId}`.

### 5.3 Tournament page — `#/t/{tourId}[/{roundId}]`
- Header: tournament name; one info line `format · tc · location · dates` (dates in the visitor's local time). "Official site" / "Standings" links when present — only if the URL starts with `https://` or `http://`, opened in a new tab with `rel="noopener noreferrer"`.
- Round picker: a row of pills (scrolls sideways). Each pill: round name + status — ✓ finished (`finishedAt`), red ● live (`ongoing`), local date + time for upcoming (`startsAt`), "after previous round" when `startsAfterPrevious`.
- Which round opens: the one in the URL, else `defaultRoundId`, else the `ongoing` one, else the last finished, else the first.
- Game list (data: E), styled like Lichess's broadcast game list:
  - Header bar: "‹" (back to the timeline), round name, 🔍 (toggles a box that filters rows by player name).
  - One row per game, numbered 1…n (board number):
    - left: a thin vertical mini eval bar (filled from the last `[%eval]` we have for that game, else neutral 50%)
    - two lines, White on top, Black below: flag · title (gold) · name
    - right, per player: finished → "1" / "0" / "½" in the §4.1 colours; ongoing → that player's clock (rules in §5.4), the side to move ticking; not started → empty
  - Click a row → `#/t/{tourId}/{roundId}/{gameId}`.
- A round with no games yet: "Pairings not published yet · starts {local date, time}".
- If the round is `ongoing`, open stream F for live updates (Phase 4).

### 5.4 Game viewer — `#/t/{tourId}/{roundId}/{gameId}`
Desktop: three columns, like Lichess's broadcast page.
- **Left (~320px):** the §5.3 game list (compact), current game highlighted; "‹" goes back to the tournament page.
- **Centre:** player bar · board · player bar. Black on top unless flipped.
  - Player bar: flag · title (gold) · name · rating (grey) … right side: finished → result box ("1" green / "0" red / "½" grey); unfinished → clock.
  - Thin vertical eval bar along the board's left edge, shown only while Analyze is on.
- **Right (~360px):**
  - Engine box: **Analyze** toggle button, big eval text (`+0.84`), small line "Stockfish 19 lite · depth 22", then the top 3 lines (MultiPV) — each `<eval> <SAN line>`, first 8 plies in SAN starting with the move number (§5.5).
  - Move list: two columns with move numbers (`1. e4  c5`), current move highlighted, click a move to jump to it. When a move has an eval (from `[%eval]` or "Analyze all moves"), show it in small grey text beside the move with one decimal (`+0.2`).
  - Under the list: ⏮ ◀ ▶ ⏭ and flip ⇅. Keyboard: ← → Home End, `f` = flip.
- **Following live:** if the viewer is on the latest move and a new move arrives, go to it. If they're looking at an earlier move, stay there and show a red "● Live" button that jumps to the latest move.
- **Clocks:**
  - Latest position of an unfinished game: each side shows its last known time (`players[i].clock`, or that colour's last `[%clk]`). The side to move counts down every second from (last known − time since the last move). "Time since the last move" = `thinkTime` when the page loads, afterwards the time since the latest stream update for that game.
  - Looking at an earlier move: show the `[%clk]` values at that move, frozen.
  - Format `h:mm:ss` from 1 hour up, else `mm:ss`. Under 10 s → red text. Never below `0:00`.
- Last-move highlight and check glow (§4.3).
- Mobile (< 900px wide): player bar, board, player bar, engine box, moves, then the game list. Board fills the width.

### 5.5 Analyze — Stockfish in the browser
- Engine: `stockfish` npm package, version 19. A small `scripts/copy-engine.js`, run from `postinstall`, copies `node_modules/stockfish/bin/stockfish-19-lite-single.js` and `stockfish-19-lite-single.wasm`, plus `node_modules/stockfish/Copying.txt` (the GPL licence), into `public/engine/` (git-ignored; Netlify's install recreates it). The single-threaded lite build (~1.7 MB) needs no special server headers. Don't use the multi-threaded builds (they need cross-origin isolation headers).
- `src/engine/engine.js` wraps `new Worker('/engine/stockfish-19-lite-single.js')`: `init()`, `analyse(fen)`, `stop()`, `onInfo(cb)`. UCI order: `uci` → wait for `uciok` → `isready` → wait for `readyok` → `ucinewgame` → `position fen <FEN>` → `go depth 22`.
- Parse `info … depth D … multipv K … score cp X` or `score mate M` … `pv m1 m2 …`. Scores are from the side to move: when Black is to move, flip the sign so the display is always from White's side. Convert each `pv` (UCI) to SAN with chess.js.
- **Top 3 lines (MultiPV):** send `setoption name MultiPV value 3` so the engine returns its three best candidate moves (`multipv 1..3`). Show them as three rows, each `<eval> <SAN line>` (e.g. `+0.12 32... Kh7 33. Rh5 Kg8`), best first. The big eval text and the eval bar follow line 1. "Analyze all moves" runs with MultiPV 1 (best line only) for speed.
- Display: centipawns → `+0.84` / `-0.84` (two decimals, always a sign, `0.00` for zero). Mate → `#3` (White mates) / `#-3` (Black mates).
- Eval bar, White's share in % = `50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1)` with cp clamped to ±1000; mate = 100% or 0%. (Same curve Lichess uses.)
- When the shown position changes while Analyze is on: send `stop`, wait for `bestmove`, then analyse the new position (debounce 150 ms). Turning Analyze off stops the engine and hides the eval bar.
- Optional "Analyze all moves" button: evaluate every position at depth 12, one after another, filling the move-list evals; cancelable; pauses while the main analysis runs.

## 6. Code layout
- `index.html`
- `netlify.toml` — build command `npm run build`, publish directory `dist`
- `scripts/copy-engine.js`
- `public/engine/` — stockfish-19-lite-single.js, .wasm, Copying.txt (git-ignored)
- `src/main.js` — app shell + hash router
- `src/api/lichess.js` — queue, 429 handling, cache, endpoints A–G, ndjson + PGN stream readers
- `src/data/fide-feds.json`
- `src/lib/pgn.js` — PGN → { headers, sans, fens, clocks, evals } via chess.js
- `src/lib/time.js` — clock formatting, local dates
- `src/engine/engine.js`
- `src/views/` — home.js, tournament.js, game.js, about.js
- `src/ui/` — timeline.js, gameList.js, board.js, playerBar.js, moveList.js, evalBar.js, flag.js
- `src/styles/` — theme.css, board.css, …
- `.gitignore`: `node_modules/`, `dist/`, `public/engine/`

## 7. Phases — one at a time
Each phase ends with `npm run build` passing and a Review section in `tasks/todo.md`.

| Phase | What | Done when |
|---|---|---|
| 0 Setup | Vite by hand in this folder (`npm init -y`, `npm i -D vite`, scripts `dev` / `build` / `preview`). Don't run `npm create vite` here: the folder isn't empty and create-vite offers to delete existing files. `git init`, `.gitignore` (§6), `netlify.toml`. Dark theme, header (site name; links Tournaments, About), footer credit, hash router with empty views, `api/lichess.js` with the queue and endpoints A–E. | `npm run dev` shows the shell, and a temporary console log lists this month's tournaments from A. |
| 1 Timeline + dropdown | §5.1, §5.2 | Past / live / upcoming colours are right; the filter changes the bars; clicking a bar or choosing from the dropdown opens `#/t/{id}`. |
| 2 Tournament page | §5.3 with flags (§4.4), no stream yet | A finished round shows every result; a live round shows clocks; an upcoming round shows its start time. |
| 3 Game viewer | §5.4 without live updates (moves and clocks from G, players from E); board §4.3 | You can step through a finished game, and moves, clocks and result match the same game on lichess.org. |
| 4 Live | Stream F → game list + viewer; follow-live; reconnect; close on route change | During a live round, a new move shows up within a few seconds of lichess.org (watch both side by side). |
| 5 Analyze | §5.5 | The start position shows a small plus for White (about +0.2 to +0.4). This position shows `#1` with best move Qxf7#: `r1bqkbnr/ppp2ppp/2np4/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 0 4` |
| 6 Polish | Mobile layout, loading skeletons, empty and error states, About page (Lichess credit, broadcast-delay note, Stockfish GPL + link to its source, piece-set credit), page title per route, favicon | Works at 375px wide; no console errors. |
| 7 Ship | Security check, push to GitHub, deploy to Netlify | The live URL works. |
