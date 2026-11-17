// Tournament page (SPEC §5.3): header, round picker, game list. No stream yet.
import { getTournament, getRound } from '../api/lichess.js';
import {
  renderGameList,
  patchGameRow,
  startClockTicker,
} from '../ui/gameList.js';
import { startLiveRound, liveInfo } from '../live/liveRound.js';
import { formatDateTime, formatDateRange } from '../lib/time.js';
import { skeleton, errorState } from '../ui/states.js';

function tournamentSkeleton() {
  const frag = document.createDocumentFragment();
  frag.append(skeleton('sk-line'), skeleton('sk-line'));
  const pills = document.createElement('div');
  pills.className = 'round-picker';
  for (let i = 0; i < 6; i++) pills.append(skeleton('sk-pill'));
  frag.append(pills);
  for (let i = 0; i < 6; i++) frag.append(skeleton('sk-row'));
  return frag;
}

// Only allow http(s) links (SPEC §5.3).
function safeHttpUrl(url) {
  return typeof url === 'string' && /^https?:\/\//.test(url) ? url : null;
}

function chooseRoundId(d, urlRoundId) {
  const rounds = d.rounds || [];
  const has = (id) => id && rounds.some((r) => r.id === id);
  if (has(urlRoundId)) return urlRoundId;
  if (has(d.defaultRoundId)) return d.defaultRoundId;
  const ongoing = rounds.find((r) => r.ongoing);
  if (ongoing) return ongoing.id;
  const finished = [...rounds].reverse().find((r) => r.finishedAt);
  if (finished) return finished.id;
  return rounds[0]?.id;
}

function makePill(round, tourId, active) {
  const pill = document.createElement('a');
  pill.className = 'round-pill' + (active ? ' active' : '');
  pill.href = `#/t/${tourId}/${round.id}`;

  const name = document.createElement('span');
  name.className = 'rp-name';
  name.textContent = round.name || '';

  const status = document.createElement('span');
  status.className = 'rp-status';
  if (round.finishedAt) {
    status.textContent = '✓';
    pill.classList.add('finished');
  } else if (round.ongoing) {
    status.textContent = '● live';
    pill.classList.add('live');
  } else if (round.startsAfterPrevious) {
    status.textContent = 'after previous round';
    pill.classList.add('upcoming');
  } else if (round.startsAt) {
    status.textContent = formatDateTime(round.startsAt);
    pill.classList.add('upcoming');
  }

  pill.append(name, status);
  return pill;
}

export function renderTournament(main, { tourId, roundId }) {
  const wrap = document.createElement('div');
  wrap.className = 'tour-page';
  main.append(wrap);

  loadTournament();

  function loadTournament() {
    wrap.replaceChildren(tournamentSkeleton());
    getTournament(tourId).then(onTournament).catch((err) => {
      console.error('[tournament] tournament (D) failed:', err);
      wrap.replaceChildren(errorState('Could not load this tournament.', loadTournament));
    });
  }

  function onTournament(d) {
      wrap.replaceChildren();
      const tour = d.tour || {};
      const info = tour.info || {};
      document.title = `${tour.name || 'Tournament'} · Chess Live`;
      const chosenId = chooseRoundId(d, roundId);

      // --- Header -----------------------------------------------------------
      const header = document.createElement('div');
      header.className = 'tour-header';
      const h1 = document.createElement('h1');
      h1.className = 'tour-name';
      h1.textContent = tour.name || 'Tournament';
      header.append(h1);

      const infoParts = [
        info.format,
        info.tc,
        info.location,
        formatDateRange(tour.dates),
      ].filter(Boolean);
      if (infoParts.length) {
        const line = document.createElement('div');
        line.className = 'tour-info';
        line.textContent = infoParts.join(' · ');
        header.append(line);
      }

      const links = document.createElement('div');
      links.className = 'tour-links';
      for (const [label, url] of [
        ['Official site', safeHttpUrl(info.website)],
        ['Standings', safeHttpUrl(info.standings)],
      ]) {
        if (!url) continue;
        const a = document.createElement('a');
        a.href = url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.textContent = label;
        links.append(a);
      }
      if (links.childElementCount) header.append(links);
      wrap.append(header);

      // --- Round picker -----------------------------------------------------
      const picker = document.createElement('div');
      picker.className = 'round-picker';
      let activePill = null;
      for (const r of d.rounds || []) {
        const pill = makePill(r, tourId, r.id === chosenId);
        if (r.id === chosenId) activePill = pill;
        picker.append(pill);
      }
      wrap.append(picker);
      if (activePill) activePill.scrollIntoView({ inline: 'center', block: 'nearest' });

      // --- Game list --------------------------------------------------------
      const listWrap = document.createElement('div');
      listWrap.className = 'game-list';
      wrap.append(listWrap);

      if (!chosenId) {
        listWrap.replaceChildren();
        const none = document.createElement('p');
        none.className = 'state-msg';
        none.textContent = 'This tournament has no rounds yet.';
        listWrap.append(none);
        return;
      }

      loadRound(listWrap, chosenId);
  }

  function loadRound(listWrap, chosenId) {
    listWrap.replaceChildren(skeleton('sk-row'), skeleton('sk-row'), skeleton('sk-row'));
    getRound(chosenId)
      .then((e) => {
        renderGameList(listWrap, {
          round: e.round,
          games: e.games,
          tourId,
          roundId: chosenId,
          backHref: '#/',
        });
        // Live updates while the round is ongoing (SPEC §5.4).
        if (e.round?.ongoing) {
          const thinkById = new Map(
            (e.games || []).map((g) => [g.id, g.thinkTime || 0]),
          );
          const live = startLiveRound(chosenId, {
            initialThink: (id) => thinkById.get(id) || 0,
            onGame: (id, entry) => {
              if (entry.parsed) {
                patchGameRow(listWrap, id, liveInfo(entry.parsed, entry.lastUpdateAt));
              }
            },
          });
          const stopTick = startClockTicker(listWrap);
          window.addEventListener(
            'hashchange',
            () => {
              live.close();
              stopTick();
            },
            { once: true },
          );
        }
      })
      .catch((err) => {
        console.error('[tournament] round (E) failed:', err);
        listWrap.replaceChildren(
          errorState('Could not load this round.', () => loadRound(listWrap, chosenId)),
        );
      });
  }
}
