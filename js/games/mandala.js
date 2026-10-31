import { el, store, segmented } from '../ui.js';

const BACKGROUND = '#14131a';

export default {
  id: 'mandala',
  title: 'Mandala',
  icon: '🌀',
  desc: 'Dessine, la symétrie fait le reste.',
  category: 'relax',
  tint: '#c3b2e6',

  mount(stage) {
    let symmetry = store.get('mandala-symmetry', 8);
    let fade = store.get('mandala-fade', true);
    let hue = Math.random() * 360;
    let frame = 0;
    const strokes = new Map();

    const canvas = el('canvas', { class: 'zen-canvas' });
    const wrap = el('div', { class: 'canvas-wrap' }, [canvas, el('p', { class: 'canvas-hint' }, 'Dessine avec un ou plusieurs doigts')]);
    const ctx = canvas.getContext('2d');
    const fadeBtn = el('button', { class: 'btn', type: 'button', 'aria-pressed': String(fade), onclick: () => {
      fade = !fade;
      store.set('mandala-fade', fade);
      fadeBtn.setAttribute('aria-pressed', String(fade));
    } }, 'Fondu');

    stage.append(
      el('div', { class: 'toolbar' }, [
        segmented([1, 4, 6, 8, 12].map((n) => ({ value: n, label: n === 1 ? 'Libre' : '×' + n })), symmetry,
          (n) => { symmetry = n; store.set('mandala-symmetry', n); }),
      ]),
      wrap,
      el('div', { class: 'toolbar center' }, [
        fadeBtn,
        el('button', { class: 'btn', type: 'button', onclick: clear }, 'Effacer'),
      ])
    );

    let w = 0, h = 0;
    function resize() {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = rect.width; h = rect.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      clear();
    }

    function clear() {
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = BACKGROUND;
      ctx.fillRect(0, 0, w, h);
    }

    function segment(x1, y1, x2, y2, width) {
      const cx = w / 2, cy = h / 2;
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
      ctx.lineWidth = width;
      ctx.strokeStyle = `hsla(${hue}, 80%, 62%, 0.55)`;
      ctx.beginPath();
      for (let i = 0; i < symmetry; i++) {
        const a = (Math.PI * 2 * i) / symmetry;
        for (const mirror of symmetry === 1 ? [1] : [1, -1]) {
          const p = rotate(x1 - cx, (y1 - cy) * mirror, a);
          const q = rotate(x2 - cx, (y2 - cy) * mirror, a);
          ctx.moveTo(cx + p[0], cy + p[1]);
          ctx.lineTo(cx + q[0], cy + q[1]);
        }
      }
      ctx.stroke();
    }

    function rotate(x, y, a) {
      const c = Math.cos(a), s = Math.sin(a);
      return [x * c - y * s, x * s + y * c];
    }

    function local(e) {
      const rect = canvas.getBoundingClientRect();
      return [e.clientX - rect.left, e.clientY - rect.top];
    }

    canvas.addEventListener('pointerdown', (e) => {
      wrap.classList.add('touched');
      canvas.setPointerCapture(e.pointerId);
      const [x, y] = local(e);
      strokes.set(e.pointerId, { x, y });
      segment(x, y, x + 0.1, y + 0.1, 6);
    });
    canvas.addEventListener('pointermove', (e) => {
      const last = strokes.get(e.pointerId);
      if (!last) return;
      const [x, y] = local(e);
      const speed = Math.hypot(x - last.x, y - last.y);
      hue = (hue + 0.6) % 360;
      // Plus on va lentement, plus le trait est épais.
      segment(last.x, last.y, x, y, Math.max(1.5, 9 - speed * 0.35));
      strokes.set(e.pointerId, { x, y });
    });
    const end = (e) => strokes.delete(e.pointerId);
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);

    function loop() {
      if (fade) {
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = 'rgba(20, 19, 26, 0.035)';
        ctx.fillRect(0, 0, w, h);
      }
      frame = requestAnimationFrame(loop);
    }

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  },
};
