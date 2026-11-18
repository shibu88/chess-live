// Custom "Top tournaments" filter dropdown (SPEC §5.1).
//
// A native <select> can't nest a hover submenu, so this is a small custom menu:
// a trigger button + a popup with two items — **Official** (tier top+high) and
// **Country ▸**, whose submenu lists curated countries. The submenu opens on
// hover (CSS) and on tap of the Country row (the `.sub-open` class) so it works
// on touch too. All names are set via textContent (untrusted).

import { makeFlag } from './flag.js';
import { COUNTRIES, countryByFed } from '../lib/country.js';

function labelFor(sel) {
  if (sel && sel.kind === 'country') {
    const c = countryByFed(sel.fed);
    return c ? c.name : 'Country';
  }
  return 'Official';
}

/**
 * Build the filter menu.
 * @param {{current: {kind:string, fed?:string}, onSelect: (sel) => void}} opts
 * @returns {HTMLElement} the `.filter-menu` element.
 */
export function renderFilterMenu({ current, onSelect }) {
  const menu = document.createElement('div');
  menu.className = 'filter-menu';

  // Trigger.
  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'filter-trigger';
  trigger.setAttribute('aria-haspopup', 'true');
  trigger.setAttribute('aria-expanded', 'false');
  const label = document.createElement('span');
  label.className = 'filter-trigger-label';
  label.textContent = labelFor(current);
  const caret = document.createElement('span');
  caret.className = 'filter-caret';
  caret.textContent = '▾';
  trigger.append(label, caret);

  // Popup.
  const pop = document.createElement('div');
  pop.className = 'filter-pop';
  pop.setAttribute('role', 'menu');

  function close() {
    menu.classList.remove('open');
    country.classList.remove('sub-open');
    trigger.setAttribute('aria-expanded', 'false');
  }
  function choose(sel) {
    label.textContent = labelFor(sel);
    close();
    onSelect(sel);
  }

  // Item: Official.
  const official = document.createElement('button');
  official.type = 'button';
  official.className = 'filter-item';
  official.setAttribute('role', 'menuitem');
  official.textContent = 'Official';
  official.addEventListener('click', () => choose({ kind: 'official' }));

  // Item: Country ▸ (with submenu).
  const country = document.createElement('div');
  country.className = 'filter-item filter-has-sub';
  const countryBtn = document.createElement('button');
  countryBtn.type = 'button';
  countryBtn.className = 'filter-item-btn';
  countryBtn.setAttribute('aria-haspopup', 'true');
  const countryLabel = document.createElement('span');
  countryLabel.textContent = 'Country';
  const chev = document.createElement('span');
  chev.className = 'filter-chev';
  chev.textContent = '▸';
  countryBtn.append(countryLabel, chev);
  // Tap toggles the submenu (hover handles desktop via CSS).
  countryBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    country.classList.toggle('sub-open');
  });

  const sub = document.createElement('div');
  sub.className = 'filter-submenu';
  sub.setAttribute('role', 'menu');
  for (const c of COUNTRIES) {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'filter-country';
    row.setAttribute('role', 'menuitem');
    const name = document.createElement('span');
    name.textContent = c.name;
    row.append(makeFlag(c.fed), name);
    row.addEventListener('click', () => choose({ kind: 'country', fed: c.fed }));
    sub.append(row);
  }
  country.append(countryBtn, sub);

  pop.append(official, country);
  menu.append(trigger, pop);

  // Open/close behaviour.
  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = menu.classList.toggle('open');
    trigger.setAttribute('aria-expanded', String(open));
    if (!open) country.classList.remove('sub-open');
  });
  document.addEventListener('click', (e) => {
    if (!menu.contains(e.target)) close();
  });
  menu.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      close();
      trigger.focus();
    }
  });

  return menu;
}
