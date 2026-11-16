# Chess Live — rules for Claude

## How we work (every task)
1. Read `docs/SPEC.md` first. Work on ONE phase at a time — the one I name.
2. Before writing code, plan that phase. Once I approve, write the plan to `tasks/todo.md` as a checklist, then build.
3. Keep every change small and simple. Touch only the files the task needs. No big rewrites.
4. As you go, tick items in `tasks/todo.md` and tell me in 1–2 lines what changed.
5. When the phase is done: `npm run build` must pass, then add a **Review** section at the end of `tasks/todo.md` (what changed, how to test it, anything left).
6. If the spec is wrong, unclear, or an API answers differently than the spec says — stop and ask. Don't guess.

## Reference files
- `docs/SPEC.md` — what to build, the Lichess API details, the look, the phases.
- `docs/fide-feds.json` — FIDE federation code → country name + flag-icons code.

## Stack (don't add more without asking)
- Vite + plain JavaScript (ES modules) + CSS. No framework, no TypeScript, no UI kit.
- `chess.js` (PGN + moves), `flag-icons` (flags), Stockfish 19 lite single-threaded (analysis, in a Web Worker).
- Hash routing (`#/...`). Static site on Netlify.

## Data rules
- All data comes from the public Lichess broadcast API, called from the browser. No API key, no token, no `.env`, no backend.
- Only use the endpoints in `docs/SPEC.md` §3. Every request goes through `src/api/lichess.js`.
- One request at a time (queue). On HTTP 429: wait 60 s, retry once, show "Lichess is busy" meanwhile.
- Live moves come from the PGN stream endpoint — never poll the PGN export.
- Footer credit: "Live games via the free Lichess broadcast service".

## Security
- Player names, tournament names and descriptions are untrusted text: render with `textContent` / `createElement`, never `innerHTML`.
- No secrets in the repo (there are none to add).
- If you add a Content-Security-Policy it must allow `connect-src https://lichess.org` and `script-src 'self' 'wasm-unsafe-eval'`, or the data and Stockfish will break.
