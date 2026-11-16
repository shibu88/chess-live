# Phase 1 — Timeline (§5.1) + Tournament dropdown & search (§5.2)

- [x] `src/styles/home.css` — §4.2 colour vars, panel header, legend, chart, bars (4 states + stripes + pulsing dot), dropdown, search
- [x] `src/main.js` — import `home.css`
- [x] `src/views/home.js` — remove TEMP log; orchestrate panel + data + classify + render
- [x] Data load: A ×5 months (this−2…this+2) sequential, merge/dedupe by `tour.id`, render progressively
- [x] Data load: B (`nb=100`) once, annotate tours (live detection, rounds, pulsing dot)
- [x] `classify(tour, bRec, now)` → past / live / upcoming / expected, barStart/barEnd, ongoingNow
- [x] `src/ui/timeline.js` — day-axis chart: month labels, grid lines, today line, row packing, bars + labels
- [x] Timeline: horizontal scroll; initial scrollLeft puts today in the right third
- [x] Timeline: click bar/label → `#/t/{id}`
- [x] Panel header: collapse arrow, title, filter `<select>` (best / best,high / all), legend
- [x] Filter change → re-fetch A with new tiers, redraw; reuse B (bars now gated by tier)
- [x] Dropdown `<select>` with optgroups Live now / Upcoming / Finished (timeline ∪ B); change → `#/t/{id}`
- [x] Search box: 3+ chars, 400 ms debounce, endpoint C, clickable results → `#/t/{id}`
- [x] localStorage (try/catch): remember collapsed state + filter
- [x] All untrusted text via `textContent` / `createElement`
- [x] `npm run dev` verified in Chrome: colours, today line, filter, click-through, no console errors
- [x] `npm run build` passes
- [x] Report current red / grey / blue tournaments for cross-check
- [x] Review section added

## Review

**What changed**
- **New `src/ui/timeline.js`** — pure Gantt renderer. Month-aligned day axis (~8px/day),
  month labels (year on the first label + every January), grid lines (brighter at a new
  year), today line, greedy row-packing (a bar *and* its label can't overlap, label width
  measured on a canvas), bars coloured by status with a striped "expected" extension and
  **green bars for "playing now"** (a round being played right now), tier-5 labels
  brighter. Horizontal scroll; initial
  `scrollLeft` puts today in the right third; scroll position preserved across re-renders.
  Click a bar/label → `#/t/{id}`. All names rendered via `textContent`/`createTextNode`.
- **New `src/styles/home.css`** — §4.2 colours as CSS vars, panel header, legend, chart,
  the four bar states + stripes + pulsing-dot keyframes, dropdown, search, active nav pill.
- **`src/views/home.js`** — rewritten as the orchestrator: panel header (collapse, title,
  tier filter, legend); loads A for 5 months (this−2…this+2) sequentially and redraws as
  each month arrives; loads B once to detect live/ongoing and supply rounds; `classify()`
  implements the §5.1 colour rules; builds the status-grouped dropdown (comprehensive:
  timeline ∪ all of B) and the debounced (400 ms, 3+ char) search via endpoint C; persists
  collapse + filter in localStorage (try/catch). Removed the Phase-0 TEMP console log.
- **`src/main.js`** — imports `home.css`.

**Fix during verification:** the "add live tours from B that fell outside the A window"
step ignored the tier filter, so "Top tier only" still showed ~100 bars (tier-3/4 leagues).
`buildItems` now gates the B-only additions with `tierAllowed()`; the dropdown stays
comprehensive. "Top tier only" now shows 4 bars; "Top + high" shows the full set.

**How to test**
1. `npm run dev` → `#/`. Dark "Top tournaments" panel with collapse arrow, tier filter,
   legend (Past/Live/Upcoming/Expected).
2. Timeline draws progressively; month labels Jul 2026…Jan 2027, red today line near today
   in the right third; grey/red/blue bars; pulsing dot on the 5 ongoing-round events;
   tier-5 names brighter; horizontal scrollbar under the chart.
3. Filter → "Top tier only" collapses to tier-5 only; reload keeps the choice; collapse
   arrow persists too.
4. Click a bar/label → `#/t/{id}` (Phase-2 placeholder). Dropdown choice → same. Type 3+
   chars in search → endpoint-C results appear; click one → `#/t/{id}`.
5. `npm run build` passes; no app console errors (6 "message channel closed" lines are
   Chrome-extension noise, not from the app).

**Colour model (per user request, overriding §5.1's pulsing dot):**
- **Green / "Playing now"** = a round is being played right now (B has an `ongoing` round).
  Legend gained a green "Playing now" swatch; these sort first under "Live now" in the
  dropdown. The live set is dynamic — at last check 10 tournaments were playing (2 at
  tier 4: Asian Nations Chess Cup Men & Women, shown green under Top + high; 8 at tier 3,
  shown green under All official).
- **Red / Live** = started but not currently playing (between rounds / in-progress league).
- **Blue / Upcoming** (striped = "Expected"), **Grey / Past** as before.

**Known rough edge (pre-existing, for Phase 6 polish):** under "All official" a single
outlier tour ("Knockout") carries a 2025 date, stretching the axis back to Sep 2025. It is
filtered out under Top + high. Also, the timeline keeps scroll position on a filter change
rather than re-centering on today (spec says re-center "on load").

**Left for later:** tournament page content + flags (Phase 2), live stream F (Phase 4).
No new dependencies; endpoints used this phase: A, B, C.
