# Analyze — top 3 engine lines (MultiPV)

Show the best 3 candidate moves in the engine box when Analyze is on, each as
`<eval> <SAN continuation>` (e.g. `+0.12 32... Kh7 33. Rh5 Kg8`). One shared
component, so it applies to every game.

## 1. Engine — MultiPV
- [x] `src/engine/engine.js` — parse `multipv N` from info lines (default 1)
- [x] `src/engine/engine.js` — `analyse(fen, { depth, multipv })` sends `setoption name MultiPV value N` when it changes; track lines by index
- [x] `src/engine/engine.js` — `onInfo` callback gains `multipv`; `analyse()` still resolves with the best line (multipv 1)

## 2. Game view — render 3 lines
- [x] `src/views/game.js` — replace single `currentEval` with `lines[]` (up to 3); big eval text + eval bar + depth use line 1
- [x] `src/views/game.js` — render up to 3 rows: `formatEval` pill + `pvToSan(fen, pvUci, 8)`, built with `createElement`/`textContent`
- [x] `src/views/game.js` — reset lines on position change; main analysis at `depth 22, multipv 3`; "Analyze all moves" at `multipv 1`

## 3. Styles
- [x] `src/styles/game.css` — add `.engine-lines` / `.engine-line` (eval pill + moves), replacing `.best-line`

## 4. Spec
- [x] `docs/SPEC.md` §5.5 — update "best line" wording to "top 3 lines (MultiPV)"

## Wrap-up
- [x] Engine-generated SAN rendered via `textContent` (no `innerHTML`)
- [x] `npm run build` passes
- [x] Review section added

## Review

**What changed**

1. **Engine now does MultiPV (`src/engine/engine.js`).**
   - `parseInfoLine` reads the `multipv K` field (defaults to `1` when absent, i.e.
     single-line searches), alongside depth/score/pv.
   - `analyse(fen, { depth, multipv })` sends `setoption name MultiPV value N` only when
     the value changes, and resets a per-search `_lines` map keyed by multipv index.
   - `_handleLine` stores each info line by its index and forwards `multipv` to `onInfo`
     listeners. On `bestmove` the promise resolves with **line 1** (the best line), so
     callers that want a single result (e.g. "Analyze all moves") are unaffected even when
     MultiPV > 1.

2. **Game viewer shows the top 3 lines (`src/views/game.js`).**
   - Replaced the single `currentEval` with a `lines[]` array (index 0..2). The big eval
     text, the "depth N" line and the eval bar all follow `lines[0]` (the best line).
   - The old single `.best-line` div is now an `.engine-lines` container. `updateEngineUI`
     renders up to three `.engine-line` rows, each an eval pill (`formatEval`) + the SAN
     continuation (`pvToSan(fen, pvUci, 8)`), built with `createElement` + `textContent`.
   - `onEngineInfo` routes each streamed line into `lines[multipv-1]`. Lines are reset to
     `[]` whenever the shown position changes, Analyze is toggled on, or Analyze is turned
     off. Main analysis runs at `depth 22, multipv 3`; "Analyze all moves" runs at
     `multipv 1` to stay fast.

3. **Styles (`src/styles/game.css`).** `.best-line` → `.engine-lines` / `.engine-line`
   with a fixed-width tabular-nums eval pill and a flexible moves column.

4. **Spec (`docs/SPEC.md` §5.5 + §5.4).** Documented the MultiPV behaviour and the 3-line
   engine box; noted "Analyze all moves" uses MultiPV 1.

**How to test**
- `npm run dev`, open any game viewer (`#/t/{tour}/{round}/{game}`), click **Analyze**.
  Within a second you should see three rows, best eval on top, e.g.
  `+0.00 32... Kg8 33. Rg5+ Kh7 34. Rh5 Kg8`. The big number and eval bar track line 1.
- Start position (`Analyze` on the initial board) → line 1 ~ `+0.2`.
- "Analyze all moves" still fills the move-list evals, then main 3-line analysis resumes.

**Left / notes**
- Lines are capped at 8 plies and 3 candidates (constants `MULTIPV` in game.js, `maxPlies`
  in `pvToSan`). Easy to bump if you want longer lines or more candidates.
- Not yet verified live in-browser against Stockfish in this session (build + unit-level
  regex check done); worth a quick visual confirm on a real game.
