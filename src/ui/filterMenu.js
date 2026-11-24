// Filter dropdown for the "Top tournaments" graph — a single menu with three
// choices: Top (default) · All · Country ▸. "Country" opens a flyout of all
// countries (flags); India opens a further flyout of Indian states ("All India"
// + Bihar/common first, then A–Z). Submenus open on hover (desktop) and on tap
// (the `.sub-open` class) so touch works too.
//
// Selection (`onSelect`) is reported as { quantity, country, state }:
//   Top            → { quantity:'top', country:null,  state:null  }
//   All            → { quantity:'all', country:null,  state:null  }
//   a country      → { quantity:'all', country:fed,   state:null  }
//   an Indian state→ { quantity:'all', country:'IND', state:key   }
// All names are set via textContent (untrusted text rule).
import { makeFlag } from './flag.js';
import {
  COUNTRIES,
  INDIA_STATES,
  COMMON_STATE_KEYS,
  countryByFed,
  stateByKey,
} from '../lib/country.js';

function labelFor(sel) {
  if (sel.state) return stateByKey(sel.state)?.name || 'India';
  if (sel.country) return countryByFed(sel.country)?.name || 'Country';
  return sel.quantity === 'all' ? 'All' : 'Top';
}

function selToPayload(sel) {
  if (sel.state) return { quantity: 'all', country: 'IND', state: sel.state };
  if (sel.country) return { quantity: 'all', country: sel.country, state: null };
  return { quantity: sel.quantity === 'all' ? 'all' : 'top', country: null, state: null };
}

export function renderFilterMenu({ current, onSelect }) {
  // Internal selection, normalised from `current`.
  let sel = current.state
    ? { state: current.state }
    : current.country
      ? { country: current.country }
      : { quantity: current.quantity === 'all' ? 'all' : 'top' };
  let tier = current.tier === 'lower' ? 'lower' : 'main'; // Main / Lower tier tab
  let curPayload = selToPayload(sel);

  function emit() {
    onSelect({ ...curPayload, tier });
  }

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
  const caret = document.createElement('span');
  caret.className = 'filter-caret';
  caret.textContent = '▾';
  trigger.append(label, caret);

  const pop = document.createElement('div');
  pop.className = 'filter-pop';
  pop.setAttribute('role', 'menu');

  function syncLabel() {
    label.textContent = labelFor(
      sel.state
        ? { state: sel.state }
        : sel.country
          ? { country: sel.country }
          : { quantity: sel.quantity },
    );
  }
  function closeAll() {
    menu.classList.remove('open');
    for (const s of menu.querySelectorAll('.sub-open'))
      s.classList.remove('sub-open');
    for (const f of menu.querySelectorAll('.filter-flyout.show'))
      f.classList.remove('show');
    trigger.setAttribute('aria-expanded', 'false');
  }
  function choose(next, payload) {
    sel = next;
    curPayload = payload;
    syncLabel();
    closeAll();
    emit();
  }

  // --- Top / All ---------------------------------------------------------
  const topItem = document.createElement('button');
  topItem.type = 'button';
  topItem.className = 'filter-item';
  topItem.setAttribute('role', 'menuitem');
  topItem.textContent = 'Top';
  topItem.addEventListener('click', () =>
    choose({ quantity: 'top' }, { quantity: 'top', country: null, state: null }),
  );

  const allItem = document.createElement('button');
  allItem.type = 'button';
  allItem.className = 'filter-item';
  allItem.setAttribute('role', 'menuitem');
  allItem.textContent = 'All';
  allItem.addEventListener('click', () =>
    choose({ quantity: 'all' }, { quantity: 'all', country: null, state: null }),
  );

  // --- Country ▸ ---------------------------------------------------------
  const countryRow = document.createElement('div');
  countryRow.className = 'filter-item filter-has-sub';
  const countryBtn = document.createElement('button');
  countryBtn.type = 'button';
  countryBtn.className = 'filter-item-btn';
  countryBtn.setAttribute('aria-haspopup', 'true');
  const countryLabel = document.createElement('span');
  countryLabel.textContent = 'Country';
  const countryChev = document.createElement('span');
  countryChev.className = 'filter-chev';
  countryChev.textContent = '▸';
  countryBtn.append(countryLabel, countryChev);
  countryBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    countryRow.classList.toggle('sub-open');
  });

  const countrySub = document.createElement('div');
  countrySub.className = 'filter-submenu';
  countrySub.setAttribute('role', 'menu');

  for (const c of COUNTRIES) {
    if (c.fed === 'IND') {
      // India ▸ — a nested flyout of Indian states.
      const indiaRow = document.createElement('div');
      indiaRow.className = 'filter-item filter-has-sub';
      const indiaBtn = document.createElement('button');
      indiaBtn.type = 'button';
      indiaBtn.className = 'filter-item-btn filter-country';
      indiaBtn.append(makeFlag('IND'));
      const indiaName = document.createElement('span');
      indiaName.textContent = 'India';
      const indiaChev = document.createElement('span');
      indiaChev.className = 'filter-chev';
      indiaChev.textContent = '▸';
      indiaBtn.append(indiaName, indiaChev);

      // India's states fly out to the side as a FIXED-position panel, so the
      // scrollable country list above can't clip it and the country list stays
      // visible (India, Argentina, … ) while it's closed.
      const stateSub = document.createElement('div');
      stateSub.className = 'filter-flyout';
      stateSub.setAttribute('role', 'menu');
      // "All India" first, then common states (Bihar first), then the rest A–Z.
      const allIndia = document.createElement('button');
      allIndia.type = 'button';
      allIndia.className = 'filter-country';
      const allIndiaName = document.createElement('span');
      allIndiaName.textContent = 'All India';
      allIndia.append(allIndiaName);
      allIndia.addEventListener('click', () =>
        choose({ country: 'IND' }, { quantity: 'all', country: 'IND', state: null }),
      );
      stateSub.append(allIndia);

      const commonS = COMMON_STATE_KEYS.map(stateByKey).filter(Boolean);
      const restS = INDIA_STATES.filter(
        (s) => !COMMON_STATE_KEYS.includes(s.key),
      ).sort((a, b) => a.name.localeCompare(b.name));
      for (const s of [...commonS, ...restS]) {
        const row = document.createElement('button');
        row.type = 'button';
        row.className = 'filter-country';
        const nm = document.createElement('span');
        nm.textContent = s.name;
        row.append(nm);
        row.addEventListener('click', () =>
          choose({ state: s.key }, { quantity: 'all', country: 'IND', state: s.key }),
        );
        stateSub.append(row);
      }

      indiaRow.append(indiaBtn, stateSub);
      countrySub.append(indiaRow);

      // Open the states panel on hover (like the Country flyout) and on tap,
      // positioning it beside the India row and clamping it to the viewport.
      let closeTimer;
      const place = () => {
        const r = indiaBtn.getBoundingClientRect();
        const w = 190;
        let left = r.right + 2;
        if (left + w > window.innerWidth) left = Math.max(4, r.left - w - 2);
        stateSub.style.left = left + 'px';
        stateSub.style.top =
          Math.min(r.top, window.innerHeight - stateSub.offsetHeight - 8) + 'px';
      };
      const openStates = () => {
        clearTimeout(closeTimer);
        stateSub.classList.add('show');
        place();
      };
      const closeStates = () => stateSub.classList.remove('show');
      const laterClose = () => {
        closeTimer = setTimeout(closeStates, 180);
      };
      indiaRow.addEventListener('mouseenter', openStates);
      indiaRow.addEventListener('mouseleave', laterClose);
      stateSub.addEventListener('mouseenter', () => clearTimeout(closeTimer));
      stateSub.addEventListener('mouseleave', laterClose);
      indiaBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        stateSub.classList.contains('show') ? closeStates() : openStates();
      });
      countrySub.addEventListener('scroll', closeStates);
    } else {
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'filter-country';
      row.setAttribute('role', 'menuitem');
      const nm = document.createElement('span');
      nm.textContent = c.name;
      row.append(makeFlag(c.fed), nm);
      row.addEventListener('click', () =>
        choose({ country: c.fed }, { quantity: 'all', country: c.fed, state: null }),
      );
      countrySub.append(row);
    }
  }
  countryRow.append(countryBtn, countrySub);

  pop.append(topItem, allItem, countryRow);
  menu.append(trigger, pop);

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = menu.classList.toggle('open');
    trigger.setAttribute('aria-expanded', String(open));
    if (!open) closeAll();
  });
  document.addEventListener('click', (e) => {
    if (!menu.contains(e.target)) closeAll();
  });
  menu.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeAll();
      trigger.focus();
    }
  });

  syncLabel();

  // --- Main / Lower-tier tabs (to the right of the dropdown) -------------
  const tabs = document.createElement('div');
  tabs.className = 'filter-qty';
  const mkTab = (text, value) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'filter-tab';
    b.textContent = text;
    b.addEventListener('click', () => {
      if (tier === value) return;
      tier = value;
      syncTabs();
      emit();
    });
    return b;
  };
  const mainTab = mkTab('Main', 'main');
  const lowerTab = mkTab('Lower tier', 'lower');
  tabs.append(mainTab, lowerTab);
  function syncTabs() {
    mainTab.classList.toggle('active', tier === 'main');
    lowerTab.classList.toggle('active', tier === 'lower');
  }
  syncTabs();

  const bar = document.createElement('div');
  bar.className = 'filter-bar';
  bar.append(menu, tabs);
  return bar;
}
