// Two-column move list (SPEC §5.4): move numbers, current ply highlighted,
// click to jump, with the PGN [%eval] shown small/grey beside each move.

function fmtEval(ev) {
  if (ev && typeof ev === 'object' && 'mate' in ev) return '#' + ev.mate;
  const n = Number(ev);
  return (n >= 0 ? '+' : '') + n.toFixed(1);
}

function moveCell(san, ply, ev, currentPly, onPick) {
  const cell = document.createElement('span');
  cell.className = 'ml-move' + (ply === currentPly ? ' current' : '');
  const s = document.createElement('span');
  s.className = 'ml-san';
  s.textContent = san;
  cell.append(s);
  if (ev != null) {
    const e = document.createElement('span');
    e.className = 'ml-eval';
    e.textContent = fmtEval(ev);
    cell.append(e);
  }
  cell.addEventListener('click', () => onPick(ply));
  return cell;
}

/**
 * opts: { sans[], evals[0..n], currentPly, onPick(ply) }
 * evals[p] is the eval AFTER ply p (so move at ply p uses evals[p]).
 */
export function renderMoveList(container, { sans, evals, currentPly, onPick }) {
  const list = document.createElement('div');
  list.className = 'move-list';

  const pairs = Math.ceil(sans.length / 2);
  for (let i = 0; i < pairs; i++) {
    const row = document.createElement('div');
    row.className = 'ml-row';
    const num = document.createElement('span');
    num.className = 'ml-num';
    num.textContent = i + 1 + '.';
    row.append(num);

    const wPly = i * 2 + 1;
    row.append(moveCell(sans[wPly - 1], wPly, evals[wPly], currentPly, onPick));

    const bPly = i * 2 + 2;
    if (sans[bPly - 1] != null) {
      row.append(moveCell(sans[bPly - 1], bPly, evals[bPly], currentPly, onPick));
    } else {
      const empty = document.createElement('span');
      empty.className = 'ml-move empty';
      row.append(empty);
    }
    list.append(row);
  }

  container.replaceChildren(list);
  const cur = list.querySelector('.ml-move.current');
  if (cur) cur.scrollIntoView({ block: 'nearest' });
}
