import type { Lang, Story } from '../types';

/** One thing to be read aloud. If `audioUrl` is set, a pre-recorded file replaces TTS. */
export interface QueueItem {
  panel: number;
  lineId: string;
  text: string;
  speaker?: string;
  kind: 'narration' | 'speech' | 'thought';
  pitch: number;
  rate: number;
  voice?: 'f' | 'm' | 'any';
  audioUrl?: string;
  lang: Lang;
}

/** The thing that actually makes sound (browser TTS, an <audio> element, or a fake in tests). */
export interface SpeechEngine {
  speak(item: QueueItem, rateMultiplier: number): Promise<void>;
  cancel(): void;
}

export type QueueStatus = 'idle' | 'playing' | 'paused' | 'ended';
export interface QueueState {
  status: QueueStatus;
  panel: number;
  lineId: string | null;
  sleepEndsAt: number | null;
}

export function buildQueue(story: Story, lang: Lang): QueueItem[] {
  const items: QueueItem[] = [];
  story.panels.forEach((p, panel) => {
    for (const l of p.lines) {
      if (l.kind === 'sfx') continue; // sound effects are not narrated
      const text = l.text[lang] ?? l.text.en;
      if (!text) continue;
      const ch = l.speaker ? story.characters[l.speaker] : undefined;
      items.push({
        panel, lineId: l.id, text, speaker: l.speaker, kind: l.kind as QueueItem['kind'],
        pitch: ch?.pitch ?? 1, rate: ch?.rate ?? 1, voice: ch?.voice, audioUrl: l.audio?.[lang], lang,
      });
    }
  });
  return items;
}

export interface QueueOptions {
  autoAdvance?: boolean; // keep going across panels (driving mode)
  now?: () => number;
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (h: unknown) => void;
}

export class AudioQueue {
  private i = 0;
  private token = 0;
  private rate = 1;
  private auto: boolean;
  private sleepHandle: unknown = null;
  state: QueueState = { status: 'idle', panel: 0, lineId: null, sleepEndsAt: null };
  private listeners = new Set<(s: QueueState) => void>();
  private now: () => number;
  private setTimer: (fn: () => void, ms: number) => unknown;
  private clearTimer: (h: unknown) => void;

  constructor(private items: QueueItem[], private engine: SpeechEngine, opts: QueueOptions = {}) {
    this.auto = opts.autoAdvance ?? true;
    this.now = opts.now ?? Date.now;
    this.setTimer = opts.setTimer ?? ((fn, ms) => setTimeout(fn, ms));
    this.clearTimer = opts.clearTimer ?? ((h) => clearTimeout(h as ReturnType<typeof setTimeout>));
    this.state.panel = items[0]?.panel ?? 0;
  }

  subscribe(fn: (s: QueueState) => void) { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; }
  private emit(patch: Partial<QueueState>) { this.state = { ...this.state, ...patch }; this.listeners.forEach((f) => f(this.state)); }

  get length() { return this.items.length; }
  setRate(r: number) { this.rate = r; }
  setAutoAdvance(on: boolean) { this.auto = on; }

  /** Start or resume from the current item. */
  play() {
    if (!this.items.length) return;
    if (this.state.status === 'ended' || this.i >= this.items.length) this.i = 0;
    this.emit({ status: 'playing' });
    void this.run(++this.token);
  }
  pause() {
    if (this.state.status !== 'playing') return;
    this.token++; this.engine.cancel();
    this.emit({ status: 'paused' });
  }
  toggle() { this.state.status === 'playing' ? this.pause() : this.play(); }

  /** Jump to the first line of a panel; keeps playing if it was playing. */
  seekPanel(panel: number) {
    const idx = this.items.findIndex((it) => it.panel >= panel);
    const wasPlaying = this.state.status === 'playing';
    this.token++; this.engine.cancel();
    this.i = idx === -1 ? this.items.length - 1 : idx;
    const it = this.items[this.i];
    this.emit({ panel: it?.panel ?? panel, lineId: wasPlaying ? it?.lineId ?? null : null, status: wasPlaying ? 'playing' : this.state.status === 'ended' ? 'paused' : this.state.status });
    if (wasPlaying) void this.run(++this.token);
  }
  nextPanel() { this.seekPanel(this.items[this.i]?.panel + 1 || this.state.panel + 1); }
  prevPanel() {
    const cur = this.items[this.i]?.panel ?? this.state.panel;
    // if we're mid-way into a panel, first press restarts it
    const firstOfCur = this.items.findIndex((it) => it.panel === cur);
    this.seekPanel(this.i > firstOfCur ? cur : Math.max(0, cur - 1));
  }

  /** Pause automatically after `minutes`; 0 cancels. */
  setSleep(minutes: number) {
    if (this.sleepHandle != null) this.clearTimer(this.sleepHandle);
    this.sleepHandle = null;
    if (minutes <= 0) { this.emit({ sleepEndsAt: null }); return; }
    this.emit({ sleepEndsAt: this.now() + minutes * 60000 });
    this.sleepHandle = this.setTimer(() => { this.sleepHandle = null; this.pause(); this.emit({ sleepEndsAt: null }); }, minutes * 60000);
  }

  dispose() { this.token++; this.engine.cancel(); if (this.sleepHandle != null) this.clearTimer(this.sleepHandle); this.listeners.clear(); }

  private async run(tok: number) {
    while (tok === this.token && this.i < this.items.length) {
      const it = this.items[this.i];
      this.emit({ panel: it.panel, lineId: it.lineId });
      try { await this.engine.speak(it, this.rate); } catch { /* engine errors end this line */ }
      if (tok !== this.token) return; // paused / seeked while speaking
      const next = this.items[this.i + 1];
      this.i++;
      if (!next) { this.emit({ status: 'ended', lineId: null }); return; }
      if (!this.auto && next.panel !== it.panel) {
        // stop at the panel boundary; the next press of play continues from the next panel
        this.emit({ status: 'paused', panel: next.panel, lineId: null });
        return;
      }
    }
  }
}
