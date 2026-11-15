import { describe, expect, it } from 'vitest';
import { AudioQueue, buildQueue, type QueueItem, type SpeechEngine } from '../src/lib/audio-queue';
import type { Story } from '../src/types';

const story: Story = {
  id: 't', langs: ['en', 'hi'], pageLayouts: ['A'],
  characters: { a: { name: { en: 'A' }, pitch: 1.4, voice: 'f' } },
  panels: [
    { id: 'p1', scene: { bg: 'forest', actors: [] }, alt: { en: '' }, lines: [
      { id: 'p1l1', kind: 'narration', text: { en: 'one', hi: 'ek' } },
      { id: 'p1l2', kind: 'sfx', text: { en: 'BANG', hi: 'dhamaka' } },
      { id: 'p1l3', kind: 'speech', speaker: 'a', text: { en: 'two', hi: 'do' }, audio: { en: '/rec/two.mp3' } } ] },
    { id: 'p2', scene: { bg: 'forest', actors: [] }, alt: { en: '' }, lines: [{ id: 'p2l1', kind: 'narration', text: { en: 'three', hi: 'teen' } }] },
    { id: 'p3', scene: { bg: 'forest', actors: [] }, alt: { en: '' }, lines: [{ id: 'p3l1', kind: 'narration', text: { en: 'four' } }] },
  ],
};

/** Fake engine: each speak() resolves only when the test calls finish(). */
class Fake implements SpeechEngine {
  spoken: string[] = []; cancelled = 0; private res: (() => void) | null = null;
  speak(item: QueueItem) { this.spoken.push(item.lineId); return new Promise<void>((r) => { this.res = r; }); }
  cancel() { this.cancelled++; const r = this.res; this.res = null; r?.(); }
  async finish() { const r = this.res; this.res = null; r?.(); await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); }
}

describe('buildQueue', () => {
  it('skips sound effects and carries voice data and recorded-audio URLs', () => {
    const q = buildQueue(story, 'en');
    expect(q.map((i) => i.lineId)).toEqual(['p1l1', 'p1l3', 'p2l1', 'p3l1']);
    expect(q[1]).toMatchObject({ pitch: 1.4, voice: 'f', audioUrl: '/rec/two.mp3', panel: 0 });
    expect(q[0].pitch).toBe(1);
  });
  it('falls back to English where a language is missing', () => {
    expect(buildQueue(story, 'hi').find((i) => i.lineId === 'p3l1')?.text).toBe('four');
  });
});

describe('AudioQueue', () => {
  it('plays lines in order and ends', async () => {
    const e = new Fake(); const q = new AudioQueue(buildQueue(story, 'en'), e);
    q.play(); expect(e.spoken).toEqual(['p1l1']);
    for (let i = 0; i < 4; i++) await e.finish();
    expect(e.spoken).toEqual(['p1l1', 'p1l3', 'p2l1', 'p3l1']);
    expect(q.state.status).toBe('ended');
  });
  it('pauses and resumes from the same line', async () => {
    const e = new Fake(); const q = new AudioQueue(buildQueue(story, 'en'), e);
    q.play(); q.pause();
    expect(q.state.status).toBe('paused');
    await Promise.resolve();
    q.play();
    expect(e.spoken).toEqual(['p1l1', 'p1l1']);
  });
  it('skips panels forward and back', () => {
    const e = new Fake(); const q = new AudioQueue(buildQueue(story, 'en'), e);
    q.play(); q.nextPanel();
    expect(q.state.panel).toBe(1);
    expect(e.spoken.at(-1)).toBe('p2l1');
    q.prevPanel();
    expect(q.state.panel).toBe(0);
  });
  it('stops at panel boundaries when auto-advance is off', async () => {
    const e = new Fake(); const q = new AudioQueue(buildQueue(story, 'en'), e, { autoAdvance: false });
    q.play(); await e.finish(); await e.finish();
    expect(q.state.status).toBe('paused');
    expect(q.state.panel).toBe(1);
    q.play(); expect(e.spoken.at(-1)).toBe('p2l1');
  });
  it('sleep timer pauses playback', () => {
    const e = new Fake(); let fire: (() => void) | null = null;
    const q = new AudioQueue(buildQueue(story, 'en'), e, { setTimer: (fn) => { fire = fn; return 1; }, clearTimer: () => {}, now: () => 1000 });
    q.play(); q.setSleep(10);
    expect(q.state.sleepEndsAt).toBe(1000 + 600000);
    fire!();
    expect(q.state.status).toBe('paused');
    expect(q.state.sleepEndsAt).toBeNull();
  });
});

describe('preload, gaps, source and whole recordings', () => {
  class Spy extends Fake { preloaded: string[][] = []; preload(items: QueueItem[]) { this.preloaded.push(items.map((i) => i.lineId)); } }
  const withAudio: Story = { ...story, panels: story.panels.map((p) => ({ ...p, lines: p.lines.map((l) => ({ ...l, audio: { en: `/a/${l.id}.mp3` } })) })) };

  it('preloads the next two recorded clips before each line', async () => {
    const e = new Spy(); const q = new AudioQueue(buildQueue(withAudio, 'en'), e);
    q.play();
    expect(e.preloaded[0]).toEqual(['p1l3', 'p2l1']);
    await e.finish();
    expect(e.preloaded[1]).toEqual(['p2l1', 'p3l1']);
  });
  it('does not preload lines without a file (device voice)', () => {
    const e = new Spy(); const q = new AudioQueue(buildQueue(story, 'en'), e); q.play();
    expect(e.preloaded[0]).toEqual(['p1l3']); // only the one with a recording
  });
  it('reports file vs device source per line', async () => {
    const e = new Fake(); const q = new AudioQueue(buildQueue(story, 'en'), e);
    q.play(); expect(q.state.source).toBe('device');
    await e.finish(); expect(q.state.source).toBe('file'); // p1l3 has a recording
  });
  it('waits a longer breath at panel boundaries than between lines, and cancels the wait on pause', async () => {
    const timers: { fn: () => void; ms: number }[] = [];
    const e = new Fake();
    const q = new AudioQueue(buildQueue(story, 'en'), e, { gapMs: { line: 100, panel: 500 }, setTimer: (fn, ms) => { timers.push({ fn, ms }); return timers.length; }, clearTimer: () => undefined });
    q.play(); await e.finish();                 // p1l1 -> p1l3: same panel
    expect(timers.at(-1)!.ms).toBe(100);
    timers.at(-1)!.fn(); await Promise.resolve(); await Promise.resolve();
    await e.finish();                           // p1l3 -> p2l1: panel boundary
    expect(timers.at(-1)!.ms).toBe(500);
    q.pause(); timers.at(-1)!.fn(); await Promise.resolve(); await Promise.resolve();
    expect(e.spoken).toEqual(['p1l1', 'p1l3']); // paused during the breath: nothing more spoken
  });
  it('builds one slice per panel from a whole-story recording', () => {
    const s: Story = { ...story, audioWhole: { en: { url: '/w.mp3', marks: [{ panel: 0, t: 0 }, { panel: 1, t: 12.5 }, { panel: 2, t: 20 }] } } };
    const items = buildQueue(s, 'en');
    expect(items.map((i) => i.segment)).toEqual([{ start: 0, end: 12.5 }, { start: 12.5, end: 20 }, { start: 20, end: undefined }]);
    expect(items.every((i) => i.audioUrl === '/w.mp3')).toBe(true);
  });
});
