import { el, store, vibrate, segmented, fmtTime } from '../ui.js';
import { tone } from '../audio.js';

// Chaque phase : [libellé, durée en secondes, type]. « in » gonfle, « out » dégonfle, « hold » maintient.
const PATTERNS = {
  coherence: { label: '5 · 5', name: 'Cohérence cardiaque', phases: [['Inspire', 5, 'in'], ['Expire', 5, 'out']] },
  square: { label: 'Carré', name: 'Respiration carrée', phases: [['Inspire', 4, 'in'], ['Retiens', 4, 'hold'], ['Expire', 4, 'out'], ['Pause', 4, 'hold']] },
  sleep: { label: '4 · 7 · 8', name: 'Pour s’endormir', phases: [['Inspire', 4, 'in'], ['Retiens', 7, 'hold'], ['Expire', 8, 'out']] },
};

const SMALL = 0.45;

export default {
  id: 'respiration',
  title: 'Respiration',
  icon: '🌬️',
  desc: 'Suis le cercle, ralentis.',
  category: 'relax',
  tint: '#a9d3b8',

  mount(stage) {
    let key = store.get('breathe-pattern', 'coherence');
    let running = false;
    let phase = 0;
    let left = 0;
    let elapsed = 0;
    let timer = null;

    const circle = el('div', { class: 'breath-circle' });
    const label = el('div', { class: 'breath-label' }, 'Touche pour commencer');
    const count = el('div', { class: 'breath-count' }, '');
    const ring = el('button', { class: 'breath-ring', type: 'button', 'aria-label': 'Démarrer ou arrêter', onclick: toggle },
      [circle, el('div', { class: 'breath-text' }, [label, count])]);
    const nameEl = el('p', { class: 'muted center' }, PATTERNS[key].name);
    const session = el('p', { class: 'muted center small' }, ' ');
    const action = el('button', { class: 'btn primary', type: 'button', onclick: toggle }, 'Commencer');

    stage.append(
      el('div', { class: 'toolbar center' }, segmented(
        Object.entries(PATTERNS).map(([value, p]) => ({ value, label: p.label })),
        key,
        (value) => { key = value; store.set('breathe-pattern', key); nameEl.textContent = PATTERNS[key].name; if (running) { stop(); start(); } }
      )),
      nameEl,
      el('div', { class: 'breath-area' }, ring),
      session,
      el('div', { class: 'center' }, action)
    );

    function scale(value, seconds) {
      circle.style.transitionDuration = seconds + 's';
      circle.style.transform = `scale(${value})`;
    }

    function enterPhase() {
      const [text, duration, kind] = PATTERNS[key].phases[phase];
      left = duration;
      label.textContent = text;
      count.textContent = left;
      if (kind === 'in') scale(1, duration);
      if (kind === 'out') scale(SMALL, duration);
      circle.dataset.kind = kind;
      tone(kind === 'in' ? 392 : kind === 'out' ? 294 : 330, { duration: 1.2, volume: 0.05 });
      vibrate(15);
    }

    function tick() {
      elapsed++;
      session.textContent = `Séance : ${fmtTime(elapsed)}`;
      if (--left > 0) { count.textContent = left; return; }
      phase = (phase + 1) % PATTERNS[key].phases.length;
      enterPhase();
    }

    function start() {
      running = true;
      phase = 0;
      action.textContent = 'Arrêter';
      enterPhase();
      timer = setInterval(tick, 1000);
    }

    function stop() {
      running = false;
      clearInterval(timer);
      action.textContent = 'Reprendre';
      label.textContent = 'En pause';
      count.textContent = '';
      delete circle.dataset.kind;
      scale(SMALL, 1.5);
    }

    function toggle() { running ? stop() : start(); }

    scale(SMALL, 0);
    return () => clearInterval(timer);
  },
};
