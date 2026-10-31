import { el, store, vibrate, stat } from '../ui.js';
import { pop } from '../audio.js';

export default {
  id: 'bulles',
  title: 'Papier bulle',
  icon: '🫧',
  desc: 'Éclate, glisse, recommence.',
  category: 'relax',
  tint: '#9cc7e4',

  mount(stage) {
    let total = store.get('bubbles-total', 0);
    let remaining = 0;
    let pressed = false;

    const counter = stat('bulles éclatées', total.toLocaleString('fr-FR'));
    const sheet = el('div', { class: 'bubble-sheet' });
    stage.append(
      el('div', { class: 'toolbar' }, [
        counter.node,
        el('button', { class: 'btn', type: 'button', onclick: fill }, 'Nouvelle feuille'),
      ]),
      sheet,
      el('p', { class: 'hint' }, 'Astuce : fais glisser ton doigt pour en éclater plusieurs.')
    );

    function fill() {
      const cols = window.innerWidth > 600 ? 8 : 6;
      const { width, height } = sheet.getBoundingClientRect();
      const rows = Math.max(4, Math.floor(height / (width / cols)));
      sheet.style.setProperty('--cols', cols);
      sheet.replaceChildren(...Array.from({ length: cols * rows }, (_, i) =>
        el('div', { class: 'bubble', style: `animation-delay:${(i % cols + Math.floor(i / cols)) * 18}ms` })
      ));
      remaining = cols * rows;
    }

    function burst(target) {
      if (!target?.classList?.contains('bubble') || target.classList.contains('popped')) return;
      target.classList.add('popped');
      pop();
      vibrate(8);
      total++;
      counter.set(total.toLocaleString('fr-FR'));
      store.set('bubbles-total', total);
      if (--remaining === 0) setTimeout(fill, 700);
    }

    sheet.addEventListener('pointerdown', (e) => { pressed = true; burst(e.target); });
    sheet.addEventListener('pointermove', (e) => {
      if (pressed) burst(document.elementFromPoint(e.clientX, e.clientY));
    });
    const release = () => { pressed = false; };
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', release);

    requestAnimationFrame(fill);

    return () => {
      window.removeEventListener('pointerup', release);
      window.removeEventListener('pointercancel', release);
    };
  },
};
