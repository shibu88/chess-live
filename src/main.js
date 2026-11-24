// Chess Live — app shell + hash router (SPEC §2).
import 'flag-icons/css/flag-icons.min.css';
import './styles/theme.css';
import './styles/home.css';
import './styles/tournament.css';
import './styles/game.css';
import './styles/states.css';
import { onStatus, searchBroadcasts } from './api/lichess.js';
import { searchLoadedTours } from './lib/tourIndex.js';
import { SITE_NAME, DEFAULT_TOUR } from './config.js';
import { renderHome } from './views/home.js';
import { renderTournament } from './views/tournament.js';
import { renderGame } from './views/game.js';
import { renderAbout } from './views/about.js';

const app = document.getElementById('app');

// --- Build the static shell once -------------------------------------------
const header = document.createElement('header');
header.className = 'site-header';

// Back arrow (top-left) — only shown on tournament/game pages.
const back = document.createElement('a');
back.className = 'site-back';
back.textContent = '←'; // ←
back.title = 'Back';
back.hidden = true;

// The back arrow retraces the user's own in-app steps, like the browser's back
// button (e.g. round 5 → the round 2 they were on before). `navIdx` is the
// forward depth from the first page loaded this session; when it's 0 there's
// nothing in-app to go back to, so the anchor's href (the logical parent) runs.
let navIdx = 0;
back.addEventListener('click', (e) => {
  if (navIdx > 0) {
    e.preventDefault();
    history.back();
  }
});

const brand = document.createElement('a');
brand.className = 'brand';
brand.href = '#/';
brand.textContent = SITE_NAME;

// Tournament search (shown in the header on the home page). Instant matches from
// the loaded tours (tourIndex) plus Lichess's broadcast search for anything else.
const headerSearch = document.createElement('div');
headerSearch.className = 'header-search';
headerSearch.hidden = true;
const searchInput = document.createElement('input');
searchInput.type = 'search';
searchInput.className = 'header-search-input';
searchInput.placeholder = 'Search tournaments…';
searchInput.setAttribute('aria-label', 'Search tournaments');
const searchResults = document.createElement('ul');
searchResults.className = 'header-search-results';
headerSearch.append(searchInput, searchResults);
wireHeaderSearch();

const nav = document.createElement('nav');
const navAbout = document.createElement('a');
navAbout.href = '#/about';
navAbout.textContent = 'About';
nav.append(navAbout);

header.append(back, brand, headerSearch, nav);

// Status banner (e.g. "Lichess is busy — retrying in 60 s").
const banner = document.createElement('div');
banner.className = 'status-banner';
banner.hidden = true;
onStatus((message) => {
  if (message) {
    banner.textContent = message;
    banner.hidden = false;
  } else {
    banner.hidden = true;
  }
});

const main = document.createElement('main');
main.className = 'site-main';

const footer = document.createElement('footer');
footer.className = 'site-footer';
footer.textContent = 'Live games via the free Lichess broadcast service';

app.append(header, banner, main, footer);

// --- Hash router ------------------------------------------------------------
// #/                              -> home
// #/t/{tourId}                    -> tournament (default round)
// #/t/{tourId}/{roundId}          -> tournament (that round)
// #/t/{tourId}/{roundId}/{gameId} -> game viewer
// #/about                         -> about
function parseHash() {
  const raw = location.hash.replace(/^#/, '');
  const parts = raw.split('/').filter(Boolean); // drop empty segments
  // Single-tournament build: the home path lands on the configured tournament.
  const homeRoute = () =>
    DEFAULT_TOUR
      ? { name: 'tournament', tourId: DEFAULT_TOUR, isHome: true }
      : { name: 'home' };
  if (parts.length === 0) return homeRoute();
  if (parts[0] === 'about') return { name: 'about' };
  if (parts[0] === 't' && parts[1]) {
    return {
      name: parts.length >= 4 ? 'game' : 'tournament',
      tourId: parts[1],
      roundId: parts[2],
      gameId: parts[3],
      // The default tournament with no round selected IS the landing page.
      isHome: !!DEFAULT_TOUR && parts[1] === DEFAULT_TOUR && parts.length < 3,
    };
  }
  return homeRoute();
}

function setActiveNav(name) {
  navAbout.classList.toggle('active', name === 'about');
}

// On tournament/game pages, show a back arrow (top-left) and centre the Home
// brand. The href is the logical parent — used as a fallback when there's no
// in-app history to step back through (e.g. a shared/reloaded URL).
function setHeaderChrome(route) {
  // The single-tournament landing looks like a home page (brand left, no back).
  const sub = (route.name === 'tournament' || route.name === 'game') && !route.isHome;
  header.classList.toggle('subpage', sub);
  back.hidden = !sub;
  if (route.name === 'game') {
    back.href = `#/t/${route.tourId}/${route.roundId}`;
  } else if (route.name === 'tournament') {
    back.href = '#/';
  }
  // Search lives in the header on the home page only.
  headerSearch.hidden = route.name !== 'home';
  if (headerSearch.hidden) {
    searchInput.value = '';
    searchResults.replaceChildren();
  }
}

// Selecting a search result: if that tournament's bar is on the home graph,
// scroll to it and flash it (staying on the home page); otherwise open its page.
function selectTour(id) {
  const onHome = parseHash().name === 'home';
  const item = onHome
    ? document.querySelector(`.timeline .tl-item[data-tour-id="${CSS.escape(id)}"]`)
    : null;
  if (!item) {
    location.hash = '#/t/' + id;
    return;
  }
  const tl = item.closest('.timeline');
  if (tl) {
    const left = item.offsetLeft - tl.clientWidth / 2 + item.offsetWidth / 2;
    tl.dataset.userScrolled = '1'; // keep this spot across re-renders
    tl.scrollTo({ left: Math.max(0, left), behavior: 'smooth' });
  }
  item.classList.remove('tl-flash');
  void item.offsetWidth; // restart the animation if clicked twice
  item.classList.add('tl-flash');
  setTimeout(() => item.classList.remove('tl-flash'), 1800);
}

// Header tournament search: a live autocomplete dropdown. Instant client-side
// matches from the loaded tours, then merged with the Lichess search API.
function wireHeaderSearch() {
  let timer = null;
  let seq = 0;

  const dedupe = (tours) => {
    const seen = new Set();
    const out = [];
    for (const t of tours) {
      if (t?.id && !seen.has(t.id)) {
        seen.add(t.id);
        out.push(t);
      }
    }
    return out;
  };

  const render = (tours) => {
    searchResults.replaceChildren();
    for (const t of tours) {
      const li = document.createElement('li');
      const loc = t.info?.location;
      li.textContent = loc ? `${t.name} · ${loc}` : t.name || '';
      // mousedown (not click) fires before the input's blur clears the list.
      li.addEventListener('mousedown', (e) => {
        e.preventDefault();
        searchInput.value = '';
        searchResults.replaceChildren();
        selectTour(t.id);
      });
      searchResults.append(li);
    }
  };

  searchInput.addEventListener('input', () => {
    const q = searchInput.value.trim();
    clearTimeout(timer);
    if (q.length < 2) {
      searchResults.replaceChildren();
      return;
    }
    const local = searchLoadedTours(q);
    render(dedupe(local).slice(0, 10));
    if (q.length < 3) return; // Lichess search wants 3+ characters
    timer = setTimeout(async () => {
      const mine = ++seq;
      try {
        const res = await searchBroadcasts(q);
        if (mine !== seq) return; // superseded by a newer keystroke
        const api = (res.currentPageResults || []).map((r) => r.tour);
        render(dedupe([...local, ...api]).slice(0, 12));
      } catch (err) {
        console.error('[header-search] failed:', err);
      }
    }, 350);
  });

  // Clear the dropdown when focus leaves (after a click has had a chance to run).
  searchInput.addEventListener('blur', () => {
    setTimeout(() => searchResults.replaceChildren(), 150);
  });
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      searchInput.value = '';
      searchResults.replaceChildren();
      searchInput.blur();
    }
  });
}

// A default per-route title; the tournament/game views refine it after loading.
const ROUTE_TITLES = {
  home: SITE_NAME,
  about: `About · ${SITE_NAME}`,
  tournament: `Tournament · ${SITE_NAME}`,
  game: `Game · ${SITE_NAME}`,
};

function render() {
  const route = parseHash();
  main.replaceChildren(); // clear previous view
  setActiveNav(route.name);
  setHeaderChrome(route);
  // The single-tournament landing (and the views, once loaded) use SITE_NAME.
  document.title = route.isHome ? SITE_NAME : ROUTE_TITLES[route.name] || SITE_NAME;
  switch (route.name) {
    case 'about':
      renderAbout(main);
      break;
    case 'tournament':
      renderTournament(main, route);
      break;
    case 'game':
      renderGame(main, route);
      break;
    case 'home':
    default:
      renderHome(main);
      break;
  }
}

// Track in-app navigation so the back arrow can retrace it. A fresh forward
// navigation (a link or `location.hash =`) creates a history entry with no
// state, which we stamp with the next index; back/forward restores a stamped
// index, letting us know when we're back at the first page (navIdx 0).
window.addEventListener('hashchange', () => {
  if (history.state && typeof history.state.navIdx === 'number') {
    navIdx = history.state.navIdx; // user went back/forward
  } else {
    navIdx += 1; // a new forward navigation
    history.replaceState({ navIdx }, '');
  }
  render();
});

// Normalise an empty hash to #/ so every view has a shareable URL, then stamp
// the initial entry as index 0. replaceState (not location.hash =) avoids an
// extra hashchange and a double render.
if (!location.hash) history.replaceState(null, '', '#/');
history.replaceState({ navIdx: 0 }, '');
render();
