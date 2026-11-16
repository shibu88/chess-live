// Game viewer — board, moves, engine (Phases 3–5). Phase 0: placeholder.
export function renderGame(main, { tourId, roundId, gameId }) {
  const panel = document.createElement('div');
  panel.className = 'panel';
  const h = document.createElement('h2');
  h.textContent = 'Game viewer';
  const p = document.createElement('p');
  p.textContent = `tour ${tourId} · round ${roundId} · game ${gameId} — coming in Phase 3.`;
  panel.append(h, p);
  main.append(panel);
}
