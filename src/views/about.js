// About view — credits and licences (Phase 6). Phase 0: placeholder.
export function renderAbout(main) {
  const panel = document.createElement('div');
  panel.className = 'panel';
  const h = document.createElement('h2');
  h.textContent = 'About';
  const p = document.createElement('p');
  p.textContent = 'Credits and licences coming in Phase 6.';
  panel.append(h, p);
  main.append(panel);
}
