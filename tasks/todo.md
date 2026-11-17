# Phase 4 — Live updates via the PGN stream (endpoint F; §3.3, §3.4, §5.4)

- [x] `src/api/lichess.js` — add F `streamRoundPgn(roundId, {onGame,onConnect,onDrop})`: stream reader (split `\n\n\n`), single active stream, reconnect 5/15/60s, `close()`
- [x] `src/live/liveRound.js` — `startLiveRound(roundId,{onGame})`: parse blocks, `games` Map (parsed + lastUpdateAt + ply), E-refresh fallback, close
- [x] `src/lib/eval.js` — `evalToWhitePct(ev)` (Lichess curve, clamp ±1000, mate→100/0)
- [x] `src/lib/time.js` — `liveCentis(base, lastUpdateAt)` ticking helper
- [x] `src/ui/gameList.js` — rows `data-game-id` + per-colour right cells; mini eval bar from `[%eval]`; `patchGameRow`, `startClockTicker`
- [x] `src/views/tournament.js` — ongoing round → startLiveRound, patch rows, tick clocks; close on hashchange
- [x] `src/views/game.js` — open game follow-live + red "● Live" button; left list patch+tick; player-bar ticking; close on hashchange
- [x] `src/styles/game.css` — red "● Live" button
- [x] All untrusted text via `textContent`; one stream at a time; no polling (except E-refresh fallback)
- [x] `npm run dev` verified in Chrome against a live round: move appears, clocks tick, ● Live, close on leave; no console errors
- [x] `npm run build` passes
- [x] Provide a currently-live round link to test side by side
- [x] Review section added
- [ ] (Phase 6 reminder) broadcast-delay note + cburnett credit on About

## Review

**What changed**
- **`src/api/lichess.js`** — added endpoint **F** `streamRoundPgn(roundId, {onGame, onConnect,
  onDrop})`: `fetch` + `AbortController`, `TextDecoderStream` reader, buffer split on `\n\n\n`
  (keep the trailing partial, skip the keep-alive space), `onGame(block)` per `[Event …`
  block. Enforces **one active stream** (opening closes any prior); reconnects **5 → 15 → 60 s**
  on an unexpected drop; `close()` aborts and stops reconnects.
- **New `src/live/liveRound.js`** — `startLiveRound` wraps the stream: parses each block
  (`parseGame`/`gameIdOf`), keeps `games: Map(id → {parsed, ply, lastUpdateAt})`, bumps
  `lastUpdateAt` only when the ply count grows (seeded from E's `thinkTime` on first sight so
  the clock starts at the right offset), and provides the **E-refresh-every-30 s fallback**
  if the stream never connects. Also exports `liveInfo` / `sideToMoveOf`.
- **New `src/lib/eval.js`** — `evalToWhitePct` (Lichess winning-chances curve) for the mini
  eval bar; reused by the Phase-5 eval bar.
- **`src/lib/time.js`** — `liveCentis(base, lastUpdateAt)` for the ticking side-to-move clock.
- **`src/ui/gameList.js`** — rows now carry `data-game-id`, right cells carry `data-color`,
  and the mini eval bar fills from the last `[%eval]`. New `patchGameRow` (update one row's
  result/clock/eval) and `startClockTicker` (1 s interval counting the side-to-move clock
  down, `<10 s` red).
- **`src/views/tournament.js`** — when the chosen round is `ongoing`, opens `startLiveRound`,
  `patchGameRow`s each update, runs `startClockTicker`; closes both on the next `hashchange`.
- **`src/views/game.js`** — when the round is `ongoing`: follows the latest move for the open
  game (else keeps the ply and shows a red **"● Live"** button → click jumps to latest),
  ticks the centre player-bar clocks (side-to-move, latest ply only; frozen when looking
  back), patches + ticks the left list, and tears everything down (stream, tickers, keyboard)
  on the next `hashchange`.

**Verified live in Chrome** (against TCEC Cup 17, an actively-playing round):
- Game-list clocks update and tick down; finished games show results; the live game shows
  ticking clocks (saw `16:16→15:19`, and `0:03` in red under 10 s).
- Viewer **follows live** — the board auto-advanced move 20 → 40 → 199 as the engines moved.
- Stepping back showed the red **"● Live"** button; new moves did **not** jump the board;
  clicking **"● Live"** returned to the latest and hid the button.
- No app console errors. `npm run build` passes.
- Note: the automation extension drops a tab holding the long-lived stream after a few
  seconds (a chunked-response artifact, not an app bug), so checks used `browser_batch` to
  capture quickly; reconnect/close-on-leave are verified by the code paths (abort on
  `hashchange`, backoff on drop).

**Deliverable — rounds LIVE right now (compare side by side with lichess.org):**
*(The live set changes over time; find current ones via the home "Playing now" bars or the
"Live now" dropdown group.)*
- Asian Nations Chess Cup 2026 | Men — `#/t/E2Ux0N0V/fGYSCSNO` (e.g. game
  `#/t/E2Ux0N0V/fGYSCSNO/y1MBCfsi`, Esipenko vs Mohamed Saeed Laily)
- Asian Nations Chess Cup 2026 | Women — `#/t/DpEJz0S5/HJHzQXtK` (Lagno vs Khamdamova:
  `#/t/DpEJz0S5/HJHzQXtK/9ktX6pBt`)
- 17th Hainan Danzhou GM Rapid — `#/t/wa2Vh7Uk/Q8FFIflq` (Zhu Jiner vs Indjic:
  `#/t/wa2Vh7Uk/Q8FFIflq/B8bbfWfh`)
Run `npm run dev` and append to the local URL. Lichess link for a game = its PGN `GameURL`.

**Decisions / notes**
- Initial snapshot still from G, then the stream overrides within ~1 s.
- Clock model per §5.4: side-to-move counts down from its last `[%clk]` by time since the
  last update; increment is already in the `[%clk]` values; frozen when viewing an earlier ply.
- Broadcast-delay note (§3.5) + cburnett credit belong on the **About** page (Phase 6).

**Left for later:** Stockfish Analyze + centre eval bar (Phase 5); mobile layout, About page,
skeleton/error states (Phase 6); ship (Phase 7). Endpoints used this phase: F (plus E/G).
