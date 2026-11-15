/** Tiny synthesized soundscape (no audio files). Off by default; the user turns it on from the header. */
import { load, save } from './storage';

let ctx: AudioContext | null = null;
let ambience: { stop: () => void } | null = null;
let on = false;
const listeners = new Set<(v: boolean) => void>();

export const soundOn = () => on;
export const onSoundChange = (fn: (v: boolean) => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };

function noiseBuffer(c: AudioContext, secs: number) {
  const b = c.createBuffer(1, c.sampleRate * secs, c.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return b;
}

function startAmbience(c: AudioContext) {
  // soft street murmur: low-passed noise with slow volume drift, plus an occasional glass clink
  const src = c.createBufferSource(); src.buffer = noiseBuffer(c, 4); src.loop = true;
  const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 520;
  const g = c.createGain(); g.gain.value = 0.05;
  const lfo = c.createOscillator(); lfo.frequency.value = 0.12;
  const lg = c.createGain(); lg.gain.value = 0.02;
  lfo.connect(lg).connect(g.gain);
  src.connect(lp).connect(g).connect(c.destination);
  src.start(); lfo.start();
  const clink = window.setInterval(() => {
    if (Math.random() < 0.5) return;
    const o = c.createOscillator(); const og = c.createGain();
    o.type = 'sine'; o.frequency.value = 1800 + Math.random() * 900;
    og.gain.setValueAtTime(0.018, c.currentTime); og.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.5);
    o.connect(og).connect(c.destination); o.start(); o.stop(c.currentTime + 0.55);
  }, 6000);
  return { stop: () => { clearInterval(clink); try { src.stop(); lfo.stop(); } catch { /* already stopped */ } } };
}

export function setSound(v: boolean) {
  on = v; save('cg:sound', v);
  if (v) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) { on = false; return; }
    ctx ??= new AC();
    void ctx.resume();
    ambience ??= startAmbience(ctx);
  } else {
    ambience?.stop(); ambience = null;
  }
  listeners.forEach((f) => f(on));
}
export const restoreSoundPref = () => load<boolean>('cg:sound', false); // never auto-starts: browsers need a gesture

export function playRustle() {
  if (!on || !ctx) return;
  const src = ctx.createBufferSource(); src.buffer = noiseBuffer(ctx, 0.3);
  const hp = ctx.createBiquadFilter(); hp.type = 'bandpass'; hp.frequency.value = 3200; hp.Q.value = 0.7;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.04);
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.28);
  src.connect(hp).connect(g).connect(ctx.destination); src.start();
}
export function dhak() {
  try { navigator.vibrate?.([18, 70, 18]); } catch { /* not supported */ }
}
