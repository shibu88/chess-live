// Green chess board (SPEC §4.3). Renders a position from a FEN with last-move
// highlight and check glow. Pieces: cburnett SVGs from /piece/cburnett/.

// THE single square-colour function (SPEC §4.3): a1 = (0,0) is dark/green,
// h1 = (7,0) is light/white. Keep this definition in one place.
export function isLightSquare(file, rank) {
  return (file + rank) % 2 === 1;
}

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

function fenToPieces(fen) {
  const rows = fen.split(' ')[0].split('/'); // rows[0] = rank 8
  const pieces = {};
  for (let r = 0; r < 8; r++) {
    const rankNum = 8 - r;
    let file = 0;
    for (const ch of rows[r]) {
      if (/\d/.test(ch)) {
        file += Number(ch);
      } else {
        const code = (ch === ch.toUpperCase() ? 'w' : 'b') + ch.toUpperCase();
        pieces[FILES[file] + rankNum] = code;
        file++;
      }
    }
  }
  return pieces;
}

/**
 * Render a board into `container`.
 * opts: { fen, orientation: 'white'|'black', lastMove: {from,to}|null,
 *         checkSquare: 'e1'|null }
 */
export function renderBoard(container, opts) {
  const { fen, orientation = 'white', lastMove, checkSquare } = opts;
  const pieces = fenToPieces(fen);

  const displayRanks =
    orientation === 'white' ? [8, 7, 6, 5, 4, 3, 2, 1] : [1, 2, 3, 4, 5, 6, 7, 8];
  const displayFiles = orientation === 'white' ? FILES : [...FILES].reverse();
  const leftFile = displayFiles[0];
  const bottomRank = displayRanks[7];

  const board = document.createElement('div');
  board.className = 'board';

  for (const rankNum of displayRanks) {
    for (const fileCh of displayFiles) {
      const fileIdx = fileCh.charCodeAt(0) - 97;
      const rankIdx = rankNum - 1;
      const light = isLightSquare(fileIdx, rankIdx);
      const square = fileCh + rankNum;

      const sq = document.createElement('div');
      sq.className = 'sq ' + (light ? 'light' : 'dark');
      if (lastMove && (lastMove.from === square || lastMove.to === square)) {
        sq.classList.add('lastmove');
      }
      if (checkSquare === square) sq.classList.add('check');

      // Coordinates: rank numbers on the left file (top-left), file letters on
      // the bottom rank (bottom-right). Text colour = opposite square colour.
      if (fileCh === leftFile) {
        const c = document.createElement('span');
        c.className = 'coord rank';
        c.textContent = String(rankNum);
        sq.append(c);
      }
      if (rankNum === bottomRank) {
        const c = document.createElement('span');
        c.className = 'coord file';
        c.textContent = fileCh;
        sq.append(c);
      }

      const code = pieces[square];
      if (code) {
        const img = document.createElement('img');
        img.className = 'piece';
        img.src = `/piece/cburnett/${code}.svg`;
        img.alt = '';
        img.draggable = false;
        sq.append(img);
      }

      board.append(sq);
    }
  }

  container.replaceChildren(board);
}
