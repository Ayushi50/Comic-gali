import { describe, expect, it } from 'vitest';
import { pickVoice, rankVoices, splitSentences, tune, voiceQuality } from '../src/lib/speech';

const v = (name: string, lang: string, localService = true) => ({ name, lang, localService });
const voices = [
  v('eSpeak Hindi', 'hi-IN'), v('Microsoft Swara Online (Natural) - Hindi (India)', 'hi-IN', false), v('Google हिन्दी', 'hi-IN', false),
  v('Lekha', 'hi-IN'), v('Alex', 'en-US'), v('Microsoft Neerja Online (Natural) - English (India)', 'en-IN', false), v('Veena', 'en-IN'),
];
describe('voice ranking', () => {
  it('puts natural/online voices first and espeak last, and excludes other languages', () => {
    const r = rankVoices(voices, 'hi').map((x) => x.name);
    expect(r[0]).toMatch(/Natural/); expect(r.at(-1)).toBe('eSpeak Hindi'); expect(r).not.toContain('Alex');
  });
  it('prefers the exact locale, then a regional one', () => {
    expect(rankVoices(voices, 'en')[0].name).toMatch(/Neerja/);            // en-IN natural beats en-US
    expect(rankVoices([v('Alex', 'en-US'), v('Veena', 'en-IN')], 'en')[0].name).toBe('Veena');
  });
  it('reports quality for the install tip', () => {
    expect(voiceQuality('hi', voices)).toBe('natural');
    expect(voiceQuality('hi', [v('eSpeak Hindi', 'hi-IN')])).toBe('basic');
    expect(voiceQuality('ta', voices)).toBe('none');
  });
  it('gives the narrator the best voice and casts characters only from comparable voices', () => {
    expect(pickVoice(voices, 'hi', 'any')?.name).toMatch(/Natural/);
    const casts = new Set(['a', 'bb', 'ccc', 'dddd'].map((s) => pickVoice(voices, 'hi', 'any', s)?.name));
    expect([...casts].every((n) => n !== 'eSpeak Hindi')).toBe(true);
  });
});
describe('splitting and tuning', () => {
  it('splits at sentence ends incl. danda, and breaks over-long sentences', () => {
    expect(splitSentences('एक राजा था। वह अच्छा था! क्या तुम जानते हो?')).toHaveLength(3);
    const long = splitSentences(('word, ').repeat(80), 100);
    expect(long.length).toBeGreaterThan(3); expect(long.every((s) => s.length <= 101)).toBe(true);
  });
  it('slows narration slightly and keeps narrator pitch neutral', () => {
    expect(tune({ kind: 'narration', rate: 1, pitch: 1.6 }, 1)).toEqual({ rate: 0.92, pitch: 1 });
    expect(tune({ kind: 'speech', rate: 1, pitch: 1.6 }, 1).pitch).toBe(1.6);
  });
});
