# Top tournaments filter menu — Official + Country

- [x] `src/lib/country.js` — curated country list (India first) + `matchCountry(fed, tour)` + `countryByFed`
- [x] `src/ui/filterMenu.js` — custom dropdown: trigger + popup with **Official** and **Country ▸** hover/tap submenu (flags via `makeFlag`)
- [x] `src/views/home.js` — swap `<select>` for the menu; add `country` state + LS key; `tourPasses` predicate in `buildItems` + `buildColumns`; onSelect loads `''` (country) vs `best,high` (official)
- [x] `src/styles/home.css` — `.filter-menu` / `.filter-trigger` / `.filter-pop` / `.filter-item` / `.filter-submenu`; hover + `.open`; responsive ≤760px
- [x] All untrusted names via `textContent` (no `innerHTML`)
- [x] `npm run build` passes
- [x] Review section added

## Review — Top tournaments filter menu

**What changed**
- **New `src/lib/country.js`** — a curated `COUNTRIES` list (India first, then USA, Spain,
  Norway, Germany, France, England) with regex patterns, plus `matchCountry(fed, tour)` and
  `countryByFed(fed)`. A tournament's country is *guessed* from its `name` + `info.location`
  (the API has no country field), so matching is **best-effort** — India has the richest city
  coverage (Chennai, Delhi, Mumbai, Kolkata, Bengaluru, …).
- **New `src/ui/filterMenu.js`** — `renderFilterMenu({current, onSelect})` builds a custom
  dropdown (a native `<select>` can't nest a hover submenu): a `.filter-trigger` button + a
  `.filter-pop` with **Official** and **Country ▸**. The Country submenu opens on hover
  (desktop) and on tap (`.sub-open`, touch), each country row showing a flag (`makeFlag`) +
  name. Outside-click and Escape close it. All names via `textContent`.
- **`src/views/home.js`** — replaced the old 3-option tier `<select>` with the menu; renamed
  the default **Top + high → "Official"** and dropped *Top tier only* / *All official*. Added
  a `country` state (persisted under `chesslive.timeline.country`) and a single `tourPasses()`
  predicate (country match when a country is picked, else the tier) applied in **both**
  `buildItems()` (graph) and `buildColumns()` (Past/Now/Upcoming) so the graph and columns
  always stay in sync with the selection. Picking a country loads all official tiers
  (`loadCalendar('')`) then narrows client-side; Official loads `best,high`.
- **`src/styles/home.css`** — replaced the unused `.filter` rule with `.filter-menu` /
  `.filter-trigger` / `.filter-caret` / `.filter-pop` / `.filter-item(-btn)` / `.filter-chev`
  / `.filter-submenu` styles (reusing the panel/border tokens and the show-on-hover idiom);
  the submenu drops inline (below the row) at ≤760px.

**How to test**
- `npm run build` (passes). `npm run dev`, open `#/`:
  - Trigger reads **Official**; graph + columns show the top+high events.
  - Open menu → hover **Country** → submenu lists India first + 6 others with flags.
  - Pick **India** → trigger reads "India"; graph and Past/Now/Upcoming all narrow to
    India-matched events (verified: 17 past events, all Chennai/Hyderabad/Mumbai/India).
  - Back to **Official** restores the full view. Selection persists across reload.

**Verified in Chrome:** menu opens, submenu reveals on hover with flags, India filters both
the graph and the columns together, Official restores. `npm run build` green; no diagnostics.

**Deferred (not built — no backing API data):** *Age group FIDE*, *Age group lower tiers*,
*Non-FIDE tournaments* (would need name-keyword heuristics with an "approximate" caveat).
Country filtering does not scope the separate search box.

---

# Home redesign — stretched day-axis + Past/Now/Upcoming card columns

- [x] `src/lib/time.js` — `formatShortRange(dates)`, `relativeDays(ms, now)`
- [x] `src/ui/timeline.js` — wider months (~14px/day), two-tier header: month names + per-day ticks + day numbers every 5th
- [x] `src/ui/tournamentColumns.js` — three columns (Past/Now/Upcoming), dots+counts, month sub-headers, cards, tags/pills, LEAGUES & SEASONS
- [x] `src/views/home.js` — build past/now/leagues/upcoming lists; render columns; remove `<select>`; keep search box above
- [x] `src/styles/home.css` — axis day ticks/numbers + taller header; three-column grid + cards + tags + pills; mobile stack
- [x] All untrusted text via `textContent`
- [x] `npm run dev` + Chrome: stretched axis with days; 3 columns with counts/tags/pills; card link → `#/t/{id}`; search box present
- [x] `npm run build` passes; console clean
- [x] Review section added

## Review

**What changed**
- **`src/ui/timeline.js`** — the top axis is stretched: `PX_PER_DAY` 8→14 and a taller
  two-tier header (`HEADER_H` 40) — month names on top, then a **tick every day** with a
  **day number every 5th** (5/10/15/20/25). Month grid lines + today line unchanged; bars
  shifted down by the taller header. (Verified: 50 day numbers + 304 day ticks rendered.)
- **New `src/ui/tournamentColumns.js`** — `renderColumns` draws three scrollable columns:
  **Past** (grey dot), **Now** (red dot), **Upcoming** (blue dot), each with a title + "N
  events" count. Cards show date range · **name** · `location · format`; Past/Upcoming group
  under month sub-headers (`NOVEMBER 2026`), Now has a **LEAGUES & SEASONS** sub-group (long
  events) with its description. Now cards show a **"Between rounds"** tag (live but not
  playing) or a green accent (`ongoingNow`); Upcoming cards show a **relative pill**
  (`today`/`in N days`). Cards link to `#/t/{id}`.
- **`src/views/home.js`** — builds `past`/`now`/`leagues`/`upcoming` from the classified A∪B
  union (league = span ≥ 40 days), renders the columns, **removed the old `<select>`**, kept
  the search box (endpoint C) above the columns.
- **`src/lib/time.js`** — `formatShortRange` (`Nov 11 – Nov 15`) and `relativeDays`.
- **`src/styles/home.css`** — axis day ticks/numbers; three-column grid, column headers with
  coloured dots + counts, month sub-headers, cards, tags, pills; columns stack at ≤760px.

**Verified in Chrome (DOM + screenshots):** axis stretched with month names, day ticks and
5/10/15/20/25 numbers; three columns Past **53** / Now **44** / Upcoming **41**; LEAGUES &
SEASONS sub-head present; 31 "Between rounds" tags; relative pills (`today`/`in 1 day`);
month sub-headers Nov/Oct/Sep…; green-bordered "playing now" cards; a card href is
`#/t/{id}`; no console errors. `npm run build` passes.

**Notes / tunable**
- Axis density: tick/day + number every 5th at 14px/day — adjust `PX_PER_DAY`/`DAY_LABELS`
  in `timeline.js` to taste.
- "League/season" threshold is span ≥ 40 days (`LEAGUE_SPAN` in `home.js`).
- The old jump-to `<select>` was removed (the columns replace it); the search box stays.

**Left for later:** Phase 7 shipping (GitHub, Netlify). The `netlify.toml` CSP fix from the
security pass is also still uncommitted.
