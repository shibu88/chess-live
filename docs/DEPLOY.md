# Deploying

Two Netlify sites are built from this one repo. **Both are manual deploys** (not
connected to GitHub), so pushing to `main` does **not** update them — you deploy
each one from your machine with the Netlify CLI.

| Site | Build | Env | Netlify site id |
|---|---|---|---|
| [chess-live-626.netlify.app](https://chess-live-626.netlify.app) | full "Home" app, all tournaments | none (defaults) | `cff53362-af8e-485b-ba09-f3238d186b26` |
| [fide-wcc-2026.netlify.app](https://fide-wcc-2026.netlify.app) | single-tournament (World Chess Championship) | `.env.wcc` | `9afeeb60-547a-496c-aa7d-c9b4b1372d16` |

## One-time setup

```bash
npm i -g netlify-cli
netlify login
```

## Deploy

```bash
npm run deploy        # builds dist/      → chess-live-626 (default "Home" app)
npm run deploy:wcc    # builds dist-wcc/  → fide-wcc-2026  (World Chess Championship)
```

Each script builds then runs `netlify deploy --prod` for the right site id (see
`package.json`). After any code change you want on **both** sites, run **both**.

## How the two builds differ

The single-tournament build is controlled entirely by two build-time env vars
(`src/config.js`):

- `VITE_SITE_NAME` — the name shown in the header and page titles.
- `VITE_DEFAULT_TOUR` — a Lichess tournament id; makes `#/` land on that
  tournament instead of the Home timeline.

For the WCC site these live in **`.env.wcc`**, which Vite loads only when built
with `--mode wcc` (`npm run build:wcc`). The default `npm run build` does not read
it, so `chess-live-626` stays the full app.

To point the single-tournament site at a different event, edit `.env.wcc` and run
`npm run deploy:wcc`.

## Gotcha that bit us once

Do **not** pass the env vars as an inline shell prefix
(`VITE_SITE_NAME=... npm run build`) — on Windows that silently fails to reach
Vite, producing a plain build with no branding. Use `npm run build:wcc` (which
loads `.env.wcc`) instead.

## Verify a deploy

```bash
# the live bundle should contain the branding for the WCC site:
curl -s https://fide-wcc-2026.netlify.app/ | grep -oE '/assets/index-[A-Za-z0-9_-]+\.js'
```

Or just open each site: `chess-live-626` header says "Home" and `#/` shows the
timeline; `fide-wcc-2026` header says "World Chess Championship" and `#/` opens
straight onto the tournament.
