# Home + tournament-page modifications

## 1. Back button + centred Home (tournament/game top bar)
- [x] `src/main.js` — add a `←` back anchor to the header; per-route toggle `subpage` class, show back + set parent href (game → `#/t/{tour}/{round}`, tournament → `#/`)
- [x] `src/styles/theme.css` — `.site-back` style + `.site-header.subpage` grid (back left, Home centre, About right); home/about header unchanged

## 2. "Top" filter option, made default
- [x] `src/ui/filterMenu.js` — add **Top** item above Official; `labelFor` returns `Top` for `kind:'top'`
- [x] `src/views/home.js` — `LS_VIEW` (default `top`); map view→tiers (`top`→`best`, `official`→`best,high`); pass `kind:view` to menu; handle `top`/`official` in `onSelect`

## 3. Short names in the graph
- [x] `src/lib/name.js` (new) — `shortTourName()` (drop `| section`, year, `FIDE`) + `fitLabel()` (drop filler words, then hard-cut)
- [x] `src/ui/timeline.js` — use short name for label text + packing width; keep full name in `title`

## Wrap-up
- [x] All untrusted names via `textContent` (no `innerHTML`)
- [x] `npm run build` passes
- [x] Review section added

## Review

**What changed**

1. **Back button + centred Home (tournament & game pages).**
   - `src/main.js` — added a `←` `.site-back` anchor to the shell header. `render()` now
     calls `setHeaderChrome(route)`, which toggles a `subpage` class on the header and shows
     the back arrow on the `tournament`/`game` routes, pointing at the **logical parent**:
     game → `#/t/{tourId}/{roundId}`, tournament → `#/`. Home and About routes are untouched.
   - `src/styles/theme.css` — added `.site-back` (hover state) and a `.site-header.subpage`
     3-column grid (`1fr auto 1fr`) that puts the back arrow left, the **Home** brand centred
     and **About** right. The non-subpage header keeps its original flex layout.
   - Parent navigation (not `history.back()`) was chosen so it works on shared/reloaded URLs —
     confirmed by loading a game URL directly: its back still targets the tournament/round.

2. **"Top" graph filter, now the default.**
   - `src/ui/filterMenu.js` — added a **Top** menu item above **Official**; `labelFor` returns
     `Top` for `kind:'top'`.
   - `src/views/home.js` — introduced `LS_VIEW` (`'top' | 'official'`, default `top`, a new
     localStorage key so returning visitors get the new default). `view` maps to the existing
     tiers string (`top`→`best`, `official`→`best,high`), which `tierAllowed()`/`loadCalendar()`
     already understand — so `Top` shows only tier-5 ("best") events, i.e. the main/elite
     tournaments. (The Lichess API has no per-tournament average rating, so tier is the proxy;
     no hard cap, to avoid hiding a live elite event.)

3. **Short tournament names in the graph (no more "…").**
   - New `src/lib/name.js`: `shortTourName()` drops the `| Section` suffix, a 4-digit year and
     the `FIDE` token; `fitLabel()` leaves a name that fits untouched, and when it's too wide
     strips trailing generic filler words (Championship, Rating, Chess, Open, …) then hard-cuts
     at a word boundary — never below 2 words, never adding "…".
   - `src/ui/timeline.js`: labels (and row-packing widths) now use the short name; the **full**
     name stays in the bar's `title` tooltip. `tournamentColumns.js` and the tournament header
     keep the full name, so the Past/Now/Upcoming cards still show full detail.
   - Results: `FIDE World Junior Chess Championship 2026 | Open` → `World Junior Chess
     Championship`; `Bihar State Senior FIDE Rating Chess Championship 2026` → `Bihar State
     Senior`; short names like `Norway Chess` are left whole.

**How to test**
- `npm run build` (passes). `npm run dev`, open `#/`:
  - Filter trigger reads **Top**; dropdown offers **Top / Official / Country ▸**; graph shows
    only elite events. Reload → **Top** persists as the default.
  - Graph labels show no "…"; hovering a bar shows the full name; Past cards show full names.
- Open a tournament: header is `←` (left) · **Home** (centre) · **About** (right); `←` → `#/`.
  Open a game: `←` → the tournament/round page (verified on a direct URL load too).

**Notes / left**
- Country matching is still best-effort (name/location text), unchanged by this work.
- `fitLabel`'s filler list is a fixed set in `name.js`; a very long name made only of
  distinctive words will be hard-cut at a word boundary (still no "…").

## Follow-ups (after review)

- [x] Filter labels renamed: tier-5 item → **Main** (default), tier-4+5 item → **Top**
      (`src/ui/filterMenu.js`; internal kinds `top`/`official` unchanged).
- [x] Back arrow now retraces the user's own in-app history (browser-back style) via a
      `navIdx` stamped on each history entry, falling back to the logical parent only at
      the first page of the session (`src/main.js`). Verified: round 5 → back → round 2.
- [x] **Upcoming-match panel** on the tournament page, above the pairings, when the
      selected round hasn't started: live countdown + start time in local/CST/IST + venue
      + watch links (Official site · Lichess).
  - New `src/ui/upcomingPanel.js`; new `formatInZone()` / `formatCountdown()` in
    `src/lib/time.js`; wired in `src/views/tournament.js` `loadRound()` (ticker stopped on
    route change); styles in `src/styles/tournament.css` (`.upcoming-panel`, `.up-*`).
  - Verified on FIDE World Chess Championship 2026 (Game 1): "STARTS IN 19h 38m 12s",
    Geneva venue, correct CST/IST conversions, pairings still shown below.
  - `npm run build` passes.

- [x] **Header tournament search** (home page) — a live autocomplete dropdown in the top
      bar. Instant client-side matches from the loaded tours + Lichess broadcast search API,
      deduped; clicking a result opens `#/t/{id}`.
  - New `src/lib/tourIndex.js` (`indexTours` / `searchLoadedTours`, multi-term AND match);
    `src/views/home.js` feeds the index on load and the old below-timeline search was
    removed; `src/main.js` adds the header search element (home route only) + `wireHeaderSearch`;
    styles in `src/styles/theme.css` (`.header-search*`), old `.picker/.search-*` CSS dropped.
  - Verified: typing "bihar state" lists every Bihar State event; selecting "Bihar State
    Senior …" opens its tournament. `npm run build` passes.

- [x] **Search result → locate on the graph.** A searched event (e.g. "Bihar State Women",
      a finished Sept event) was in the India-filtered graph but scrolled off-screen because
      the graph opens centred on *today*. Now selecting a search result, when its bar is on
      the current graph, smooth-scrolls the timeline to centre that bar and flashes it
      (staying on home); when it isn't on the graph (different filter/time window), it opens
      the tournament page instead.
  - `src/ui/timeline.js` stamps each bar with `data-tour-id`; `src/main.js` `selectTour(id)`
    does the scroll+flash-or-open; flash animation in `src/styles/home.css` (`.tl-flash`).
  - Diagnosed via the live data: the event is tier 3, Sep 27–29, location "Sharasa, Bihar -
    India" (so it *does* pass the India filter) — the only issue was horizontal scroll.
  - Verified: selecting it scrolled the graph (138→20px) to bring the bar into view and
    flashed it, staying on home. `npm run build` passes.

- [x] **Filter is now All / Top / Country ▸.** "Top" = tier 5 only (the main/elite events,
      the default); "All" = every tournament (all tiers); Country unchanged. Replaces the
      earlier Main/Top(+high) pair.
  - `src/ui/filterMenu.js` items All (`kind:'all'`) + Top (`kind:'top'`); `src/views/home.js`
    `view` is `'all'|'top'` (default `top`, old values migrated), mapping `all→tiers '' `,
    `top→tiers 'best'`; `tierAllowed` simplified.
  - Verified live: Top → 10 events (tier-5 main tournaments), All → 503 events (all tiers);
    labels read Top / All. `npm run build` passes.

- [x] **Filter is now selectable tabs** (segmented control, store-style) instead of a
      dropdown: **Top** (first + default) · **All** · **Country ▾** (dropdown). Active tab is
      highlighted.
  - Rewrote `src/ui/filterMenu.js` to `.filter-tabs`/`.filter-tab` pills (+ Country popup);
    replaced the old `.filter-menu/.filter-pop/...` CSS with tab styles in `src/styles/home.css`.
  - Verified: Top active by default; clicking All/Top/Country toggles the active pill and
    reloads the graph. `npm run build` passes.
  - Note: "All" shows every tournament **within the graph's ±2-month window**. The user's
    example (Bihar State Sub-Junior U-15 Girls) is dated Jun 2026 — outside that window, so
    it's reachable via search (spans all Lichess) but not drawn on the graph.

- [x] **Removed the "Watch" row** (Official site · Lichess links) from the upcoming-match
      panel — `src/ui/upcomingPanel.js` (dropped the links + `safeHttpUrl`), unused `.up-watch`
      CSS removed from `src/styles/tournament.css`. Countdown, timezones and Venue stay; the
      tournament header's own Official site/Standings links are unchanged. Build passes.

- [x] **Filter = dropdown + contextual tabs + India states.** A `<select>` picks Top / All /
      Country. Country reveals quick country tabs (COMMON_FEDS: India, USA, England, Norway,
      Spain, France) + "More ▾" (rest, A–Z). Picking India reveals "All India" + common state
      tabs (TN, MH, Delhi, WB, Karnataka, Gujarat, UP) + "More ▾" (rest of 24 states, A–Z).
  - `src/lib/country.js`: added `COMMON_FEDS`, `INDIA_STATES` (name + city patterns),
    `stateByKey`, `matchIndiaState`. `src/ui/filterMenu.js` rewritten (select + two
    `.filter-subrow` tab rows + reusable `buildMore` A–Z dropdown). `src/views/home.js`:
    `stateKey` state + `LS_STATE`, new `onSelect` kinds (`top`/`all`/`country`/`state`),
    `tourPasses` does `matchCountry('IND') && matchIndiaState(key)` for states. CSS for
    `.filter-area/.filter-mode/.filter-subrow/.filter-more*` in `src/styles/home.css`.
  - Verified: Country→India shows the tabs; selecting Bihar (from state "More") narrows the
    graph to the 3 Bihar events and the More button reads "Bihar". `npm run build` passes.

- [x] **Reworked to location dropdowns + Top/All quantity tabs** (final design).
  - Left: `Country ▾` dropdown (All countries / Common group / A–Z) and, when India, a
    `State ▾` dropdown (All India / Common group with **Bihar first** / A–Z). Right: `[Top][All]`
    tabs. Top (default) = the top ~10 events of the current selection ranked by tier then date;
    All = every event of the selection. Works at any scope (global, country, state).
  - `src/lib/country.js`: added `COMMON_STATE_KEYS` (Bihar first). `src/ui/filterMenu.js`
    rewritten to two `<select>`s (optgroups Common/A–Z) + Top/All pill tabs; selection is
    `{quantity, country, state}`. `src/views/home.js`: `quantity`/`country`/`stateKey` state,
    `tiersFor()` (country→all tiers; global Top→best,high; global All→all), `computeTopIds()`
    (top-N cap over the drawn candidate pool) + `tourVisible()`, applied in `draw`/`buildItems`/
    `buildColumns`; removed `tierAllowed`. CSS trimmed to `.filter-area/.filter-mode/.filter-qty`.
  - Bug found & fixed: the Top cap originally ranked over *all* broadcast (B) tours, so recent
    tier-5 events outside the graph window bumped on-graph events out (showed 7 of 10). Now the
    cap ranks over the same pool the graph draws (calendar + live-only broadcasts).
  - Verified: global Top → 10 (9 tier-5 + 1 tier-4); India Top → 10; India→Bihar → its 3 events
    under both Top and All; Bihar sits at the top of the state dropdown. `npm run build` passes.

- [x] **Final filter: one nested dropdown** (Top / All / Country ▸), flyout style like the
      user's reference screenshot. Country ▸ → all countries (flags, India first); India ▸ →
      Indian states ("All India" + Bihar/common first, then A–Z). Top (default) = top ~10
      global, All = all global, a country/state = all events of that location.
  - `src/ui/filterMenu.js` rewritten to a custom `.filter-menu` (trigger + `.filter-pop`) with
    hover/tap submenus (`.filter-has-sub`/`.sub-open`), 3 levels deep for India→states; emits
    `{quantity, country, state}` (home.js logic unchanged). Re-added the dropdown/submenu CSS in
    `src/styles/home.css` (replaced the select+tabs styles).
  - Verified via the live DOM: menu = Top/All/Country; countries flyout India-first; states
    flyout = All India, Bihar, Tamil Nadu, … (25); selecting Bihar sets the trigger to "Bihar"
    and filters the graph to the 3 Bihar events. `npm run build` passes.

- [x] **India states open inline + Main/Lower-tier tabs.**
  - India's state submenu was clipped (a side-flyout nested in the scrollable country list).
    Made it expand **inline** (`.filter-substates`: static position, indented) so it opens on
    hover like Country. `src/ui/filterMenu.js` + `src/styles/home.css`.
  - Added **Main** / **Lower tier** pill tabs right of the dropdown (`src/ui/filterMenu.js`,
    `.filter-bar`/`.filter-qty` CSS). **Main** = elite tiers 4-5 (capped 10); **Lower tier** =
    local tier 3. Selection now carries `tier`; `src/views/home.js` adds `tier`/`LS_TIER`,
    `tierPass()` in `tourPasses`, `needCap()` (cap on Main or global Top), and `tiersFor()` =
    `best,high` for Main / `''` for Lower tier.
  - Verified: default Top+Main → 10 elite; India→Bihar + Main → 0 (no elite); Bihar + Lower
    tier → the 3 Bihar local events (Women/Junior/Senior). India states open inline on hover.
    `npm run build` passes.
  - Caveat: the "Bihar Sub-Junior U-15 Girls" example is a June 2026 event, outside the graph's
    ±2-month window, so it shows in search but not on the graph (unchanged time-window limit).

- [x] **India states → fixed side flyout** (country list stays visible). The inline states
      expanded at the top of the (scrollable) country list and hid the countries. Reworked
      India's states into a `position:fixed` `.filter-flyout` that opens on hover/tap beside the
      India row (JS positions + clamps it to the viewport; closes on leave/scroll/menu-close).
      Now opening Country always shows India, Argentina, Armenia, … and India's states fly out
      to the side. `src/ui/filterMenu.js` + `src/styles/home.css`. Verified live + `npm run build`.
