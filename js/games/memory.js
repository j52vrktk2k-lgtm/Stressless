import { el, store, vibrate, segmented, stat, stopwatch, fmtTime, overlay, shuffle } from '../ui.js';
import { tone, chime } from '../audio.js';

const SYMBOLS = ['🌸', '🍃', '🌊', '🌙', '⭐', '🍄', '🐚', '🌈', '🦋', '🌻'];
const LEVELS = {
  easy: { label: 'Facile', cols: 3, pairs: 6 },
  normal: { label: 'Normal', cols: 4, pairs: 8 },
  hard: { label: 'Difficile', cols: 4, pairs: 10 },
};

export default {
  id: 'memory',
  title: 'Memory',
  icon: '🃏',
  desc: 'Retrouve les paires.',
  category: 'mind',
  tint: '#f1c58f',

  mount(stage) {
    let level = store.get('memory-level', 'normal');
    let moves = 0;
    let found = 0;
    let open = [];
    let locked = false;

    const movesStat = stat('coups', 0);
    const timeStat = stat('temps', '0:00');
    const bestStat = stat('record', '–');
    const clock = stopwatch((s) => timeStat.set(fmtTime(s)));
    const board = el('div', { class: 'memory-board' });

    stage.append(
      el('div', { class: 'toolbar center' }, segmented(
        Object.entries(LEVELS).map(([value, l]) => ({ value, label: l.label })), level,
        (value) => { level = value; store.set('memory-level', level); deal(); }
      )),
      el('div', { class: 'stats' }, [movesStat.node, timeStat.node, bestStat.node]),
      board
    );

    function deal() {
      const { cols, pairs } = LEVELS[level];
      const picks = shuffle(SYMBOLS.slice()).slice(0, pairs);
      const deck = shuffle([...picks, ...picks]);
      moves = 0; found = 0; open = []; locked = false;
      movesStat.set(0);
      clock.reset();
      const best = store.get('memory-best-' + level, null);
      bestStat.set(best ?? '–');
      board.style.setProperty('--cols', cols);
      board.replaceChildren(...deck.map((symbol) => {
        const card = el('button', { class: 'mcard', type: 'button', 'aria-label': 'Carte cachée' },
          el('span', { class: 'mcard-inner' }, [
            el('span', { class: 'mcard-face mcard-back' }),
            el('span', { class: 'mcard-face mcard-front' }, symbol),
          ]));
        card.addEventListener('click', () => flip(card, symbol));
        return card;
      }));
    }

    function flip(card, symbol) {
      if (locked || card.classList.contains('flipped')) return;
      clock.start();
      card.classList.add('flipped');
      card.setAttribute('aria-label', symbol);
      tone(660, { duration: 0.12, volume: 0.05 });
      open.push({ card, symbol });
      if (open.length < 2) return;

      moves++;
      movesStat.set(moves);
      const [a, b] = open;
      open = [];
      if (a.symbol === b.symbol) {
        a.card.classList.add('matched');
        b.card.classList.add('matched');
        vibrate(20);
        tone(880, { duration: 0.3, volume: 0.06, type: 'triangle' });
        if (++found === LEVELS[level].pairs) win();
      } else {
        locked = true;
        setTimeout(() => {
          for (const { card: c } of [a, b]) { c.classList.remove('flipped'); c.setAttribute('aria-label', 'Carte cachée'); }
          locked = false;
        }, 850);
      }
    }

    function win() {
      clock.stop();
      const key = 'memory-best-' + level;
      const best = store.get(key, null);
      const record = best == null || moves < best;
      if (record) store.set(key, moves);
      chime();
      setTimeout(() => overlay(stage, {
        emoji: record ? '🏆' : '🌟',
        title: record ? 'Nouveau record !' : 'Bravo !',
        lines: [`${moves} coups en ${fmtTime(clock.seconds)}`],
        onAction: deal,
      }), 500);
    }

    deal();
    return () => clock.stop();
  },
};
