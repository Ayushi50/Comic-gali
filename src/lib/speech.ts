import type { QueueItem, SpeechEngine } from './audio-queue';
import { LANG_TAG } from './i18n';

const FEMALE = /female|woman|heera|kalpana|lekha|swara|veena|priya|aditi|raveena|neerja|pallavi|shruti|sapna|tara/i;

export const speechSupported = () => typeof window !== 'undefined' && 'speechSynthesis' in window;

export function getVoices(): SpeechSynthesisVoice[] {
  return speechSupported() ? window.speechSynthesis.getVoices() : [];
}
export function voicesFor(lang: string): SpeechSynthesisVoice[] {
  const base = LANG_TAG[lang as keyof typeof LANG_TAG]?.split('-')[0] ?? lang;
  return getVoices().filter((v) => v.lang.toLowerCase().replace('_', '-').startsWith(base));
}
export function hasVoice(lang: string) { return voicesFor(lang).length > 0; }

/** Picks a voice for a character: respects a gender hint where voice names allow, else spreads speakers over voices. */
export function pickVoice(lang: string, hint: QueueItem['voice'], speaker?: string): SpeechSynthesisVoice | undefined {
  const vs = voicesFor(lang);
  if (!vs.length) return undefined;
  const pool = hint === 'f' ? vs.filter((v) => FEMALE.test(v.name)) : hint === 'm' ? vs.filter((v) => !FEMALE.test(v.name)) : vs;
  const list = pool.length ? pool : vs;
  const h = [...(speaker ?? 'narrator')].reduce((a, c) => a + c.charCodeAt(0), 0);
  return list.find((v) => v.lang.toLowerCase().startsWith(LANG_TAG[lang as keyof typeof LANG_TAG].toLowerCase())) && list.length === 1 ? list[0] : list[h % list.length];
}

/** Plays a pre-recorded file when the item has one, otherwise uses browser TTS. */
export class BrowserEngine implements SpeechEngine {
  private audio: HTMLAudioElement | null = null;
  private stop: (() => void) | null = null;

  speak(item: QueueItem, rateMult: number): Promise<void> {
    return new Promise((resolve) => {
      this.stop = resolve;
      if (item.audioUrl) {
        const a = new Audio(item.audioUrl);
        a.playbackRate = rateMult;
        a.onended = () => resolve();
        a.onerror = () => resolve();
        this.audio = a;
        void a.play().catch(() => resolve());
        return;
      }
      if (!speechSupported()) { setTimeout(resolve, 600 + item.text.length * 40); return; } // silent reading pace
      const u = new SpeechSynthesisUtterance(item.text);
      u.lang = LANG_TAG[item.lang];
      const v = pickVoice(item.lang, item.voice, item.speaker);
      if (v) u.voice = v;
      u.pitch = Math.min(2, Math.max(0, item.pitch));
      u.rate = Math.min(2, Math.max(0.5, item.rate * rateMult));
      u.onend = () => resolve();
      u.onerror = () => resolve();
      window.speechSynthesis.speak(u);
    });
  }
  cancel() {
    if (this.audio) { this.audio.pause(); this.audio = null; }
    if (speechSupported()) window.speechSynthesis.cancel();
    this.stop?.(); this.stop = null;
  }
}
