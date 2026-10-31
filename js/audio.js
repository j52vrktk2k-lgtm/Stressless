// Sons synthétisés avec Web Audio : aucun fichier à télécharger.
import { store } from './ui.js';

let ctx = null;

function audio() {
  if (store.get('muted', false)) return null;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  if (!ctx) ctx = new Ctx();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

// Les navigateurs mobiles n'autorisent le son qu'après un geste de l'utilisateur.
export function unlock() { audio(); }

export function isMuted() { return store.get('muted', false); }
export function setMuted(muted) { store.set('muted', muted); }

export function tone(freq, { duration = 0.4, volume = 0.12, type = 'sine', glideTo } = {}) {
  const c = audio();
  if (!c) return;
  const t = c.currentTime;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, t + duration);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(volume, t + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.connect(gain).connect(c.destination);
  osc.start(t);
  osc.stop(t + duration + 0.05);
}

export function pop() {
  const c = audio();
  if (!c) return;
  const t = c.currentTime;
  // Petit claquement de bruit filtré + chute de hauteur rapide.
  const len = Math.floor(c.sampleRate * 0.04);
  const buffer = c.createBuffer(1, len, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3;
  const noise = c.createBufferSource();
  noise.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 1200 + Math.random() * 1400;
  filter.Q.value = 1.2;
  const gain = c.createGain();
  gain.gain.value = 0.9;
  noise.connect(filter).connect(gain).connect(c.destination);
  noise.start(t);
  tone(500 + Math.random() * 300, { duration: 0.07, volume: 0.15, glideTo: 90 });
}

export function chime(notes = [523.25, 659.25, 783.99]) {
  notes.forEach((f, i) => setTimeout(() => tone(f, { duration: 0.6, volume: 0.08, type: 'triangle' }), i * 110));
}
