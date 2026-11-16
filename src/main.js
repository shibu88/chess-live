// Chess Live — app shell + hash router (SPEC §2).
import './styles/theme.css';
import { onStatus } from './api/lichess.js';
import { renderHome } from './views/home.js';
import { renderTournament } from './views/tournament.js';
import { renderGame } from './views/game.js';
import { renderAbout } from './views/about.js';

const app = document.getElementById('app');

// --- Build the static shell once -------------------------------------------
const header = document.createElement('header');
header.className = 'site-header';

const brand = document.createElement('a');
brand.className = 'brand';
brand.href = '#/';
brand.textContent = 'Chess Live';

const nav = document.createElement('nav');
const navTournaments = document.createElement('a');
navTournaments.href = '#/';
navTournaments.textContent = 'Tournaments';
const navAbout = document.createElement('a');
navAbout.href = '#/about';
navAbout.textContent = 'About';
nav.append(navTournaments, navAbout);

header.append(brand, nav);

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
  if (parts.length === 0) return { name: 'home' };
  if (parts[0] === 'about') return { name: 'about' };
  if (parts[0] === 't' && parts[1]) {
    return {
      name: parts.length >= 4 ? 'game' : 'tournament',
      tourId: parts[1],
      roundId: parts[2],
      gameId: parts[3],
    };
  }
  return { name: 'home' };
}

function setActiveNav(name) {
  navTournaments.classList.toggle('active', name !== 'about');
  navAbout.classList.toggle('active', name === 'about');
}

function render() {
  const route = parseHash();
  main.replaceChildren(); // clear previous view
  setActiveNav(route.name);
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

window.addEventListener('hashchange', render);

// Normalise an empty hash to #/ so every view has a shareable URL.
// Use replaceState (not location.hash =) so this doesn't fire an extra
// hashchange and render twice.
if (!location.hash) history.replaceState(null, '', '#/');
render();
