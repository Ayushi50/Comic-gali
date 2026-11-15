import type { QueueItem, SpeechEngine } from './audio-queue';
import { LANG_TAG } from './i18n';

const FEMALE = /female|woman|heera|kalpana|lekha|swara|veena|priya|aditi|raveena|neerja|pallavi|shruti|sapna|tara|vani|kavya|sunita|divya|anu\b|lalitha|neha|jaya|kavitha/i;

export const speechSupported = () => typeof window !== 'undefined' && 'speechSynthesis' in window;
export function getVoices(): SpeechSynthesisVoice[] { return speechSupported() ? window.speechSynthesis.getVoices() : []; }

type V = Pick<SpeechSynthesisVoice, 'name' | 'lang' | 'localService'>;
const base = (tag: string) => tag.toLowerCase().replace('_', '-').split('-')[0];
const baseOf = (lang: string) => base(LANG_TAG[lang as keyof typeof LANG_TAG] ?? lang);

/**
 * Higher = more natural. Edge/Chrome expose free network or "Natural"/"Neural" voices; macOS/iOS have "Enhanced"/"Premium";
 * eSpeak-style and "compact" voices are the robotic ones.
 */
export function scoreVoice(v: V, lang: string): number {
  const tag = v.lang.toLowerCase().replace('_', '-');
  const want = (LANG_TAG[lang as keyof typeof LANG_TAG] ?? lang).toLowerCase();
  if (base(tag) !== baseOf(lang)) return -Infinity;
  let s = 0;
  if (tag === want) s += 30; else if (tag.startsWith(baseOf(lang) + '-')) s += 10; // exact locale, then another region of the same language
  if (/natural|neural|online|enhanced|premium|siri/i.test(v.name)) s += 50;
  if (/^google /i.test(v.name)) s += 20;           // Chrome network voices
  if (!v.localService) s += 10;                     // network voices are usually neural
  if (/espeak|compact|festival|flite|robot/i.test(v.name)) s -= 40;
  return s;
}
export function rankVoices<T extends V>(voices: T[], lang: string): T[] {
  return voices.map((v) => [v, scoreVoice(v, lang)] as const).filter(([, s]) => s > -Infinity).sort((a, b) => b[1] - a[1]).map(([v]) => v);
}
export const voicesFor = (lang: string) => rankVoices(getVoices(), lang);
export const hasVoice = (lang: string) => voicesFor(lang).length > 0;
/** 'natural' = a neural/enhanced voice exists, 'basic' = only an ordinary voice, 'none'. Drives the install tip. */
export function voiceQuality(lang: string, voices: V[] = getVoices()): 'natural' | 'basic' | 'none' {
  const r = rankVoices(voices, lang); if (!r.length) return 'none';
  return scoreVoice(r[0], lang) >= 50 ? 'natural' : 'basic';
}

/** Picks a voice for a speaker: best-ranked pool, with a gender hint where voice names allow, spreading speakers over the top voices. */
export function pickVoice<T extends V>(voices: T[], lang: string, hint: QueueItem['voice'], speaker?: string): T | undefined {
  const vs = rankVoices(voices, lang);
  if (!vs.length) return undefined;
  const top = scoreVoice(vs[0], lang);
  const best = vs.filter((v) => scoreVoice(v, lang) >= top - 10); // only voices of similar quality are cast
  const pool = hint === 'f' ? best.filter((v) => FEMALE.test(v.name)) : hint === 'm' ? best.filter((v) => !FEMALE.test(v.name)) : best;
  const list = pool.length ? pool : best;
  if (!speaker) return list[0]; // narrator always gets the best voice
  const h = [...speaker].reduce((a, c) => a + c.charCodeAt(0), 0);
  return list[h % list.length];
}

/** Splits at sentence ends (. ! ? । ॥ …) so no utterance is long; Chrome silently stops very long utterances. */
export function splitSentences(text: string, max = 160): string[] {
  const parts = text.replace(/\s+/g, ' ').trim().match(/[^.!?।॥…]+[.!?।॥…]*["”’)]*\s*/g) ?? [text];
  const out: string[] = [];
  for (const raw of parts) {
    let p = raw.trim(); if (!p) continue;
    while (p.length > max) { // break an over-long sentence at a comma/space near the limit
      let cut = p.lastIndexOf(',', max); if (cut < max / 2) cut = p.lastIndexOf(' ', max); if (cut < 1) cut = max;
      out.push(p.slice(0, cut + 1).trim()); p = p.slice(cut + 1).trim();
    }
    if (p) out.push(p);
  }
  return out;
}
/** Gentle tuning for device voices: slightly slower narration, subtle per-character pitch. */
export const tune = (item: Pick<QueueItem, 'kind' | 'rate' | 'pitch'>, rateMult: number) => ({
  rate: Math.min(2, Math.max(0.5, item.rate * rateMult * (item.kind === 'narration' ? 0.92 : 0.97))),
  pitch: Math.min(2, Math.max(0, item.kind === 'narration' ? 1 : item.pitch)),
});

/**
 * Plays a recorded/generated file through ONE reused <audio> element (iOS only allows autoplay on an element the user already
 * activated), preloading the next clips; otherwise uses device speech, split into sentences.
 */
export class BrowserEngine implements SpeechEngine {
  private audio: HTMLAudioElement | null = null;
  private warm = new Map<string, HTMLAudioElement>();
  private stopFn: (() => void) | null = null;
  onSource?: (s: 'file' | 'device') => void;

  private el() {
    if (!this.audio) { this.audio = new Audio(); this.audio.preload = 'auto'; (this.audio as HTMLAudioElement & { preservesPitch: boolean }).preservesPitch = true; }
    return this.audio;
  }
  /** Keep a few hidden elements fetching upcoming clips so the HTTP cache has them (gapless). */
  preload(items: QueueItem[]) {
    const urls = new Set(items.map((i) => i.audioUrl!).filter(Boolean));
    for (const [u, a] of this.warm) if (!urls.has(u)) { a.src = ''; this.warm.delete(u); }
    for (const u of urls) if (!this.warm.has(u)) { const a = new Audio(); a.preload = 'auto'; a.src = u; this.warm.set(u, a); }
  }
  speak(item: QueueItem, rateMult: number): Promise<void> {
    return new Promise((resolve) => {
      let done = false;
      const finish = () => { if (!done) { done = true; this.stopFn = null; resolve(); } };
      this.stopFn = finish;
      if (item.audioUrl) {
        const a = this.el();
        const seg = item.segment;
        const fallback = () => { if (!done) this.speakDevice(item, rateMult, finish); };
        a.onended = finish; a.onerror = fallback; a.ontimeupdate = null;
        if (seg?.end != null) a.ontimeupdate = () => { if (a.currentTime >= seg.end!) { a.pause(); finish(); } };
        a.src = item.audioUrl; a.playbackRate = rateMult;
        const go = () => { if (seg) a.currentTime = seg.start; void a.play().then(() => this.onSource?.('file')).catch(fallback); };
        if (seg && a.readyState < 1) a.onloadedmetadata = go; else go();
        return;
      }
      this.speakDevice(item, rateMult, finish);
    });
  }
  private speakDevice(item: QueueItem, rateMult: number, finish: () => void) {
    this.onSource?.('device');
    if (!speechSupported()) { setTimeout(finish, 600 + item.text.length * 40); return; } // silent reading pace
    const synth = window.speechSynthesis;
    const voice = pickVoice(getVoices(), item.lang, item.voice, item.speaker);
    const { rate, pitch } = tune(item, rateMult);
    const chunks = splitSentences(item.text);
    let i = 0;
    const next = () => {
      if (i >= chunks.length) { finish(); return; }
      const u = new SpeechSynthesisUtterance(chunks[i++]);
      u.lang = LANG_TAG[item.lang]; if (voice) u.voice = voice; u.rate = rate; u.pitch = pitch;
      u.onend = () => setTimeout(next, i < chunks.length ? 180 : 0); // short breath between sentences
      u.onerror = () => finish();
      synth.speak(u);
    };
    next();
  }
  cancel() {
    if (this.audio) { this.audio.pause(); this.audio.onended = this.audio.onerror = this.audio.ontimeupdate = this.audio.onloadedmetadata = null; }
    if (speechSupported()) window.speechSynthesis.cancel();
    this.stopFn?.();
  }
}
