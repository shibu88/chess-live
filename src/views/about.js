// About page (SPEC §6): credits and licences.

function extLink(text, href) {
  const a = document.createElement('a');
  a.href = href;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  a.textContent = text;
  return a;
}

function section(title, nodes) {
  const frag = document.createDocumentFragment();
  const h = document.createElement('h3');
  h.className = 'about-h';
  h.textContent = title;
  frag.append(h);
  const p = document.createElement('p');
  p.append(...nodes);
  frag.append(p);
  return frag;
}

export function renderAbout(main) {
  const panel = document.createElement('div');
  panel.className = 'panel about-page';

  const h1 = document.createElement('h2');
  h1.textContent = 'About Home';
  panel.append(h1);

  const intro = document.createElement('p');
  intro.textContent =
    'Home follows over-the-board chess tournaments broadcast on Lichess. It is a static site with no backend and no account required.';
  panel.append(intro);

  panel.append(
    section('Data', [
      'Tournaments, rounds and live moves come from the free ',
      extLink('Lichess broadcast API', 'https://lichess.org/api'),
      '. Home is not affiliated with ',
      extLink('Lichess', 'https://lichess.org'),
      '.',
    ]),
  );

  panel.append(
    section('Broadcast delay', [
      'Many top events publish their moves with a delay set by the organiser, to discourage cheating. Home shows each move when Lichess publishes it, so the board here can lag the one at the venue.',
    ]),
  );

  panel.append(
    section('Analysis engine', [
      'Analysis runs ',
      extLink('Stockfish 19', 'https://github.com/official-stockfish/Stockfish'),
      ' (lite, single-threaded) in your browser via WebAssembly. Stockfish is free software under the ',
      extLink('GNU General Public License v3', 'https://www.gnu.org/licenses/gpl-3.0.html'),
      '; its source is linked above and a copy of the licence ships with the engine (',
      extLink('Copying.txt', '/engine/Copying.txt'),
      ').',
    ]),
  );

  panel.append(
    section('Chess pieces', [
      'The board uses the ',
      extLink(
        'cburnett piece set',
        'https://github.com/lichess-org/lila/tree/master/public/piece/cburnett',
      ),
      ' by Colin M.L. Burnett, licensed ',
      extLink('GPLv2+', 'https://www.gnu.org/licenses/old-licenses/gpl-2.0.html'),
      '.',
    ]),
  );

  main.append(panel);
}
