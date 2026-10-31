import { el } from './ui.js';
import { isMuted, setMuted, unlock } from './audio.js';
import bubbles from './games/bubbles.js';
import breathe from './games/breathe.js';
import mandala from './games/mandala.js';
import slider from './games/slider.js';
import memory from './games/memory.js';

// Pour ajouter un jeu : créer un module dans js/games/ et l'ajouter ici.
const GAMES = [bubbles, breathe, mandala, memory, slider];

const CATEGORIES = [
  { id: 'relax', title: 'Se détendre', sub: 'Pas de score, pas de pression.' },
  { id: 'mind', title: 'Réfléchir', sub: 'Occuper l’esprit, en douceur.' },
];

const ICONS = {
  back: '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  sound: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor"/><path d="M15.5 9a4 4 0 010 6M18 6.5a7.5 7.5 0 010 11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  muted: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor"/><path d="M16 9.5l5 5M21 9.5l-5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
};

const app = document.getElementById('app');
let cleanup = null;

function muteButton() {
  const btn = el('button', { class: 'icon-btn', type: 'button' });
  const paint = () => {
    btn.innerHTML = isMuted() ? ICONS.muted : ICONS.sound;
    btn.setAttribute('aria-label', isMuted() ? 'Activer le son' : 'Couper le son');
  };
  btn.addEventListener('click', () => { setMuted(!isMuted()); paint(); });
  paint();
  return btn;
}

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return 'Encore debout ? Respire un coup.';
  if (h < 12) return 'Bonjour. Prends un moment pour toi.';
  if (h < 18) return 'Une petite pause s’impose.';
  return 'Bonsoir. On relâche la pression.';
}

function renderHome() {
  document.title = 'Stressless';
  app.replaceChildren(
    el('header', { class: 'home-head' }, [
      el('div', {}, [
        el('h1', { class: 'brand' }, 'Stressless'),
        el('p', { class: 'muted' }, greeting()),
      ]),
      muteButton(),
    ]),
    el('main', { class: 'home' }, CATEGORIES.map((cat) =>
      el('section', { class: 'category' }, [
        el('h2', {}, cat.title),
        el('p', { class: 'muted small' }, cat.sub),
        el('div', { class: 'cards' }, GAMES.filter((g) => g.category === cat.id).map((g) =>
          el('a', { class: 'card', href: '#/' + g.id, style: `--tint:${g.tint}` }, [
            el('span', { class: 'card-icon', 'aria-hidden': 'true' }, g.icon),
            el('span', { class: 'card-title' }, g.title),
            el('span', { class: 'card-desc' }, g.desc),
          ])
        )),
      ])
    ))
  );
}

function renderGame(game) {
  document.title = `${game.title} · Stressless`;
  const stage = el('main', { class: `stage stage-${game.id}`, style: `--tint:${game.tint}` });
  app.replaceChildren(
    el('header', { class: 'topbar' }, [
      el('a', { class: 'icon-btn', href: '#/', 'aria-label': 'Retour', html: ICONS.back }),
      el('h1', {}, game.title),
      muteButton(),
    ]),
    stage
  );
  cleanup = game.mount(stage) || null;
}

function route() {
  if (cleanup) { cleanup(); cleanup = null; }
  const id = location.hash.replace(/^#\/?/, '');
  const game = GAMES.find((g) => g.id === id);
  if (game) renderGame(game); else renderHome();
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', route);
document.addEventListener('pointerdown', unlock, { once: true });
route();

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
