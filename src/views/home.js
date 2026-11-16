// Home view — timeline + tournament dropdown (Phase 1).
// Phase 0: placeholder + a temporary console log of this month's tournaments (A).
import { getCalendarMonth } from '../api/lichess.js';

export function renderHome(main) {
  const panel = document.createElement('div');
  panel.className = 'panel';
  const h = document.createElement('h2');
  h.textContent = 'Top tournaments';
  const p = document.createElement('p');
  p.textContent = 'Timeline coming in Phase 1.';
  panel.append(h, p);
  main.append(panel);

  // TEMP — remove in Phase 1. Log this month's tournaments from endpoint A.
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // JS months are 0-based
  getCalendarMonth(year, month)
    .then((items) => {
      console.log(
        `[Phase 0] ${items.length} tournament(s) from calendar ${year}-${month}:`,
      );
      for (const it of items) {
        console.log(' •', it.tour?.name, '—', it.tour?.id);
      }
      console.log('[Phase 0] raw:', items);
    })
    .catch((err) => console.error('[Phase 0] calendar A failed:', err));
}
