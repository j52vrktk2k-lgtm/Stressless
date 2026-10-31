// Petits utilitaires partagés par l'application et les jeux.

export function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value == null || value === false) continue;
    if (key === 'html') node.innerHTML = value;
    else if (key === 'class') node.className = value;
    else if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
    else node.setAttribute(key, value === true ? '' : value);
  }
  for (const child of [].concat(children)) {
    if (child == null || child === false) continue;
    node.append(child instanceof Node ? child : String(child));
  }
  return node;
}

// localStorage peut être indisponible (navigation privée) : on ne plante jamais.
export const store = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem('sl:' + key);
      return raw == null ? fallback : JSON.parse(raw);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try { localStorage.setItem('sl:' + key, JSON.stringify(value)); } catch {}
  },
  remove(key) {
    try { localStorage.removeItem('sl:' + key); } catch {}
  },
};

export function vibrate(pattern) {
  if (store.get('muted', false)) return;
  try { navigator.vibrate?.(pattern); } catch {}
}

export function shuffle(list) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

export function fmtTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// Sélecteur en « pilule » : options = [{ value, label }].
export function segmented(options, value, onChange) {
  const root = el('div', { class: 'segmented', role: 'radiogroup' });
  const buttons = options.map((opt, i) =>
    el('button', {
      type: 'button',
      role: 'radio',
      'aria-checked': String(opt.value === value),
      onclick: () => {
        buttons.forEach((b, j) => b.setAttribute('aria-checked', String(i === j)));
        onChange(opt.value);
      },
    }, opt.label)
  );
  root.append(...buttons);
  return root;
}

export function stat(label, value = '') {
  const valueEl = el('span', { class: 'stat-value' }, value);
  const node = el('div', { class: 'stat' }, [valueEl, el('span', { class: 'stat-label' }, label)]);
  return { node, set: (v) => { valueEl.textContent = v; } };
}

// Chronomètre qui démarre au premier coup.
export function stopwatch(onTick) {
  let seconds = 0;
  let id = null;
  return {
    get seconds() { return seconds; },
    start() {
      if (id) return;
      id = setInterval(() => { seconds++; onTick(seconds); }, 1000);
    },
    stop() { clearInterval(id); id = null; },
    reset(value = 0) { this.stop(); seconds = value; onTick(seconds); },
  };
}

export function overlay(stage, { emoji = '✨', title, lines = [], button = 'Rejouer', onAction }) {
  const node = el('div', { class: 'overlay' },
    el('div', { class: 'overlay-card' }, [
      el('div', { class: 'overlay-emoji' }, emoji),
      el('h2', {}, title),
      ...lines.map((line) => el('p', {}, line)),
      el('button', {
        class: 'btn primary',
        onclick: () => { node.remove(); onAction?.(); },
      }, button),
    ])
  );
  stage.append(node);
  return node;
}
