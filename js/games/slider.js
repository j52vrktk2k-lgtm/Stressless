import { el, store, vibrate, segmented, stat, stopwatch, fmtTime, overlay } from '../ui.js';
import { tone, chime } from '../audio.js';

export default {
  id: 'taquin',
  title: 'Taquin',
  icon: '🧩',
  desc: 'Remets les tuiles dans l’ordre.',
  category: 'mind',
  tint: '#e9a9a0',

  mount(stage) {
    let size = store.get('slider-size', 3);
    let tiles = [];     // tiles[position] = numéro de tuile (0 = case vide)
    let nodes = [];     // nodes[numéro] = élément DOM
    let moves = 0;
    let playing = false;

    const movesStat = stat('coups', 0);
    const timeStat = stat('temps', '0:00');
    const bestStat = stat('record', '–');
    const clock = stopwatch((s) => timeStat.set(fmtTime(s)));
    const board = el('div', { class: 'slider-board' });

    stage.append(
      el('div', { class: 'toolbar center' }, [
        segmented([{ value: 3, label: '3 × 3' }, { value: 4, label: '4 × 4' }, { value: 5, label: '5 × 5' }], size,
          (value) => { size = value; store.set('slider-size', size); newGame(); }),
      ]),
      el('div', { class: 'stats' }, [movesStat.node, timeStat.node, bestStat.node]),
      board,
      el('div', { class: 'center' }, el('button', { class: 'btn', type: 'button', onclick: () => newGame() }, 'Mélanger'))
    );

    function solved() {
      return tiles.every((t, i) => t === (i + 1) % (size * size));
    }

    function neighbours(pos) {
      const r = Math.floor(pos / size), c = pos % size;
      const out = [];
      if (r > 0) out.push(pos - size);
      if (r < size - 1) out.push(pos + size);
      if (c > 0) out.push(pos - 1);
      if (c < size - 1) out.push(pos + 1);
      return out;
    }

    function newGame() {
      const n = size * size;
      tiles = Array.from({ length: n }, (_, i) => (i + 1) % n);
      // Mélange par coups valides depuis l'état résolu : toujours soluble.
      let empty = n - 1, previous = -1;
      for (let i = 0; i < n * 40 || solved(); i++) {
        const options = neighbours(empty).filter((p) => p !== previous);
        const pick = options[Math.floor(Math.random() * options.length)];
        [tiles[empty], tiles[pick]] = [tiles[pick], tiles[empty]];
        previous = empty;
        empty = pick;
      }
      moves = 0;
      playing = true;
      movesStat.set(0);
      clock.reset();
      bestStat.set(formatBest(store.get('slider-best-' + size, null)));
      build();
    }

    function build() {
      board.style.setProperty('--size', size);
      nodes = [];
      for (let t = 1; t < size * size; t++) {
        const home = t - 1;
        const r = Math.floor(home / size), c = home % size;
        // Teinte en dégradé : l'image résolue forme un joli fondu.
        const hue = 200 + (r + c) * (120 / (2 * size - 2));
        nodes[t] = el('button', {
          class: 'tile', type: 'button',
          style: `--h:${hue}`,
          onclick: () => press(tiles.indexOf(t)),
        }, el('span', {}, t));
      }
      board.replaceChildren(...nodes.slice(1));
      place();
    }

    function place() {
      tiles.forEach((t, pos) => {
        if (!t) return;
        nodes[t].style.setProperty('--x', pos % size);
        nodes[t].style.setProperty('--y', Math.floor(pos / size));
        nodes[t].classList.toggle('home', t === pos + 1);
      });
    }

    function press(pos) {
      if (!playing) return;
      let empty = tiles.indexOf(0);
      const sameRow = Math.floor(pos / size) === Math.floor(empty / size);
      const sameCol = pos % size === empty % size;
      if (pos === empty || (!sameRow && !sameCol)) return;
      // On peut pousser toute une ligne d'un coup vers la case vide.
      const step = sameRow ? Math.sign(pos - empty) : Math.sign(pos - empty) * size;
      while (empty !== pos) {
        tiles[empty] = tiles[empty + step];
        tiles[empty + step] = 0;
        empty += step;
        moves++;
      }
      clock.start();
      movesStat.set(moves);
      tone(300 + Math.random() * 60, { duration: 0.08, volume: 0.05, type: 'triangle' });
      vibrate(6);
      place();
      if (solved()) win();
    }

    function formatBest(best) {
      return best ? `${best.moves} · ${fmtTime(best.time)}` : '–';
    }

    function win() {
      playing = false;
      clock.stop();
      const key = 'slider-best-' + size;
      const best = store.get(key, null);
      const result = { moves, time: clock.seconds };
      const record = !best || moves < best.moves || (moves === best.moves && result.time < best.time);
      if (record) { store.set(key, result); bestStat.set(formatBest(result)); }
      chime();
      board.classList.add('done');
      setTimeout(() => {
        board.classList.remove('done');
        overlay(stage, {
          emoji: record ? '🏆' : '🧩',
          title: record ? 'Nouveau record !' : 'Résolu !',
          lines: [`${moves} coups en ${fmtTime(result.time)}`],
          onAction: newGame,
        });
      }, 900);
    }

    newGame();
    return () => clock.stop();
  },
};
