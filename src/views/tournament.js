// Tournament view — rounds + game list (Phase 2). Phase 0: placeholder.
export function renderTournament(main, { tourId, roundId }) {
  const panel = document.createElement('div');
  panel.className = 'panel';
  const h = document.createElement('h2');
  h.textContent = 'Tournament';
  const p = document.createElement('p');
  p.textContent = roundId
    ? `tour ${tourId} · round ${roundId} — coming in Phase 2.`
    : `tour ${tourId} — coming in Phase 2.`;
  panel.append(h, p);
  main.append(panel);
}
