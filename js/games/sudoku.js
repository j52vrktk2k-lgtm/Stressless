import { el, store, vibrate, segmented, stat, stopwatch, fmtTime, overlay, shuffle } from '../ui.js';
import { tone, chime } from '../audio.js';

const LEVELS = {
  easy: { label: 'Facile', clues: 40 },
  medium: { label: 'Moyen', clues: 32 },
  hard: { label: 'Difficile', clues: 26 },
};

const boxOf = (r, c) => Math.floor(r / 3) * 3 + Math.floor(c / 3);
const bits = (m) => { let n = 0; while (m) { m &= m - 1; n++; } return n; };

// Solveur par retour arrière (masques de bits + case la plus contrainte d'abord).
// Compte les solutions jusqu'à `limit`. Avec `random`, la grille reste remplie par la première solution.
function search(grid, limit, random = false) {
  const rows = new Array(9).fill(0), cols = new Array(9).fill(0), boxes = new Array(9).fill(0);
  for (let i = 0; i < 81; i++) {
    if (!grid[i]) continue;
    const r = Math.floor(i / 9), c = i % 9, bit = 1 << grid[i];
    rows[r] |= bit; cols[c] |= bit; boxes[boxOf(r, c)] |= bit;
  }
  let count = 0;
  (function solve() {
    let best = -1, bestMask = 0, bestCount = 10;
    for (let i = 0; i < 81; i++) {
      if (grid[i]) continue;
      const r = Math.floor(i / 9), c = i % 9;
      const mask = ~(rows[r] | cols[c] | boxes[boxOf(r, c)]) & 0x3fe;
      const n = bits(mask);
      if (n < bestCount) { best = i; bestMask = mask; bestCount = n; if (!n) return false; }
    }
    if (best < 0) return ++count >= limit;
    const digits = [];
    for (let d = 1; d <= 9; d++) if (bestMask & (1 << d)) digits.push(d);
    if (random) shuffle(digits);
    const r = Math.floor(best / 9), c = best % 9, b = boxOf(r, c);
    for (const d of digits) {
      const bit = 1 << d;
      grid[best] = d; rows[r] |= bit; cols[c] |= bit; boxes[b] |= bit;
      if (solve()) return true;
      grid[best] = 0; rows[r] ^= bit; cols[c] ^= bit; boxes[b] ^= bit;
    }
    return false;
  })();
  return count;
}

function generate(clues) {
  const solution = new Array(81).fill(0);
  search(solution, 1, true);
  const puzzle = solution.slice();
  let filled = 81;
  for (const i of shuffle([...Array(81).keys()])) {
    if (filled <= clues) break;
    const keep = puzzle[i];
    puzzle[i] = 0;
    if (search(puzzle.slice(), 2) !== 1) puzzle[i] = keep; // solution unique obligatoire
    else filled--;
  }
  return { puzzle, solution };
}

export default {
  id: 'sudoku',
  title: 'Sudoku',
  icon: '🔢',
  desc: 'Logique pure, à ton rythme.',
  category: 'mind',
  tint: '#a7b8e8',

  mount(stage) {
    let level = store.get('sudoku-level', 'easy');
    let game = null;          // { puzzle, solution, values, notes, level, time }
    let selected = -1;
    let notesMode = false;

    const timeStat = stat('temps', '0:00');
    const errorStat = stat('erreurs', 0);
    const clock = stopwatch((s) => { timeStat.set(fmtTime(s)); if (game) { game.time = s; if (s % 5 === 0) save(); } });
    const grid = el('div', { class: 'sudoku-grid' });
    const cells = Array.from({ length: 81 }, (_, i) => {
      const r = Math.floor(i / 9), c = i % 9;
      const cell = el('button', { class: 'scell', type: 'button', 'data-r': r, 'data-c': c, onclick: () => select(i) });
      grid.append(cell);
      return cell;
    });
    const notesBtn = el('button', { class: 'pad-key pad-tool', type: 'button', 'aria-pressed': 'false', onclick: () => {
      notesMode = !notesMode;
      notesBtn.setAttribute('aria-pressed', String(notesMode));
    } }, '✏️ Notes');
    const padKeys = [];
    const pad = el('div', { class: 'sudoku-pad' }, [
      ...Array.from({ length: 9 }, (_, i) => {
        const key = el('button', { class: 'pad-key', type: 'button', onclick: () => input(i + 1) }, i + 1);
        padKeys.push(key);
        return key;
      }),
    ]);

    stage.append(
      el('div', { class: 'toolbar center' }, segmented(
        Object.entries(LEVELS).map(([value, l]) => ({ value, label: l.label })), level,
        (value) => { level = value; store.set('sudoku-level', level); newGame(); }
      )),
      el('div', { class: 'stats' }, [timeStat.node, errorStat.node,
        el('button', { class: 'btn small-btn', type: 'button', onclick: newGame }, 'Nouvelle grille')]),
      grid,
      el('div', { class: 'sudoku-tools' }, [
        notesBtn,
        el('button', { class: 'pad-key pad-tool', type: 'button', onclick: () => input(0) }, '⌫ Effacer'),
      ]),
      pad
    );

    function save() { if (game) store.set('sudoku-save', game); }

    function newGame() {
      const { puzzle, solution } = generate(LEVELS[level].clues);
      game = { puzzle, solution, values: puzzle.slice(), notes: new Array(81).fill(0), level, time: 0, errors: 0 };
      selected = -1;
      start();
    }

    function start() {
      clock.reset(game.time);
      clock.start();
      errorStat.set(game.errors);
      save();
      render();
    }

    function select(i) {
      selected = i;
      render();
    }

    function input(digit) {
      if (selected < 0 || game.puzzle[selected]) return;
      const i = selected;
      if (digit === 0) {
        game.values[i] = 0;
        game.notes[i] = 0;
      } else if (notesMode && !game.values[i]) {
        game.notes[i] ^= 1 << digit;
      } else {
        if (game.values[i] === digit) return;
        game.values[i] = digit;
        game.notes[i] = 0;
        if (digit !== game.solution[i]) {
          game.errors++;
          errorStat.set(game.errors);
          vibrate([30, 40, 30]);
        } else {
          clearNotes(i, digit);
          tone(520 + digit * 30, { duration: 0.1, volume: 0.05, type: 'triangle' });
          vibrate(6);
        }
      }
      save();
      render();
      if (game.values.every((v, k) => v === game.solution[k])) win();
    }

    // Une fois un chiffre placé, on le retire des notes de sa ligne, colonne et carré.
    function clearNotes(i, digit) {
      const r = Math.floor(i / 9), c = i % 9;
      for (let k = 0; k < 81; k++) {
        const kr = Math.floor(k / 9), kc = k % 9;
        if (kr === r || kc === c || boxOf(kr, kc) === boxOf(r, c)) game.notes[k] &= ~(1 << digit);
      }
    }

    function render() {
      const sr = Math.floor(selected / 9), sc = selected % 9;
      const selectedValue = selected >= 0 ? game.values[selected] : 0;
      const counts = new Array(10).fill(0);
      game.values.forEach((v, k) => { if (v && v === game.solution[k]) counts[v]++; });

      cells.forEach((cell, i) => {
        const r = Math.floor(i / 9), c = i % 9;
        const value = game.values[i];
        cell.className = 'scell';
        if (game.puzzle[i]) cell.classList.add('given');
        if (selected >= 0 && (r === sr || c === sc || boxOf(r, c) === boxOf(sr, sc))) cell.classList.add('peer');
        if (selectedValue && value === selectedValue) cell.classList.add('same');
        if (i === selected) cell.classList.add('selected');
        if (value && value !== game.solution[i]) cell.classList.add('wrong');
        if (value) {
          cell.textContent = value;
        } else if (game.notes[i]) {
          cell.replaceChildren(el('span', { class: 'notes' },
            Array.from({ length: 9 }, (_, d) => el('span', {}, game.notes[i] & (1 << (d + 1)) ? d + 1 : ''))));
        } else {
          cell.textContent = '';
        }
      });
      padKeys.forEach((key, d) => key.classList.toggle('complete', counts[d + 1] >= 9));
    }

    function win() {
      clock.stop();
      store.remove('sudoku-save');
      const key = 'sudoku-best-' + game.level;
      const best = store.get(key, null);
      const record = best == null || game.time < best;
      if (record) store.set(key, game.time);
      chime([523.25, 659.25, 783.99, 1046.5]);
      selected = -1;
      render();
      setTimeout(() => overlay(stage, {
        emoji: record ? '🏆' : '🧠',
        title: record ? 'Nouveau record !' : 'Grille terminée !',
        lines: [`${LEVELS[game.level].label} · ${fmtTime(game.time)} · ${game.errors} erreur${game.errors > 1 ? 's' : ''}`],
        button: 'Nouvelle grille',
        onAction: newGame,
      }), 400);
    }

    function onKey(e) {
      if (e.key >= '1' && e.key <= '9') input(Number(e.key));
      else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') input(0);
    }
    document.addEventListener('keydown', onKey);

    const saved = store.get('sudoku-save', null);
    if (saved?.solution?.length === 81) { game = saved; game.errors ??= 0; start(); }
    else newGame();

    return () => {
      clock.stop();
      save();
      document.removeEventListener('keydown', onKey);
    };
  },
};
