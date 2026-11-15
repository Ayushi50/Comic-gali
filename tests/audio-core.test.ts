import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { applyLexicon, archetypeFor, castLine, hashKey, joinWithPauses, normalizeText, numberToWordsEn, planJobs, splitSentences, wavDurationMs, wavFrom } from '../scripts/lib/audio-core.mjs';

const voices = JSON.parse(readFileSync('content-src/voices.json', 'utf8'));
const story = { id: 's', characters: { king: { pitch: 0.6, voice: 'm' }, mouse: { pitch: 1.7 }, aunt: { pitch: 1.1, voice: 'f' }, fox: { pitch: 1, voice: 'm' } }, panels: [
  { lines: [{ id: 'p1l1', kind: 'narration', text: { hi: 'एक राजा था… वह बूढ़ा था।' } }, { id: 'p1l2', kind: 'sfx', text: { hi: 'धड़ाम!' } }, { id: 'p1l3', kind: 'speech', speaker: 'mouse', text: { hi: 'चलो!' } }] },
  { lines: [{ id: 'p2l1', kind: 'thought', speaker: 'king', text: { hi: 'हम्म।' } }] }] };

describe('text normalisation', () => {
  it('turns numbers into words (English), ellipses and dashes into pauses, and ends with a sentence mark', () => {
    expect(normalizeText('He had 21 coins — and 105 more...', 'en')).toBe('He had twenty-one coins, and one hundred and five more.');
    expect(numberToWordsEn(2523)).toBe('two thousand five hundred and twenty-three');
  });
  it('handles Indic punctuation', () => {
    expect(normalizeText('चलो॥', 'hi')).toBe('चलो।'); expect(normalizeText('चलो', 'hi')).toBe('चलो।');
  });
  it('applies the pronunciation lexicon on whole words only', () => {
    expect(applyLexicon('Betaal and Betaals', { Betaal: 'Baitaal' })).toBe('Baitaal and Betaals');
    expect(applyLexicon('बेताल', { बेताल: 'बैताल' })).toBe('बैताल');
  });
  it('splits sentences for synthesis', () => { expect(splitSentences('एक। दो! तीन?')).toEqual(['एक।', 'दो!', 'तीन?']); });
});
describe('voice casting', () => {
  it('derives archetypes from existing pitch/gender and honours explicit castings', () => {
    expect(archetypeFor(story, 'king')).toBe('elder'); expect(archetypeFor(story, 'mouse')).toBe('child');
    expect(archetypeFor(story, 'aunt')).toBe('adult_f'); expect(archetypeFor(story, 'fox')).toBe('adult_m');
    expect(archetypeFor(story, 'fox', { s: { fox: 'trickster' } })).toBe('trickster'); expect(archetypeFor(story, undefined)).toBe('narrator');
  });
  it('gives narrator and characters distinct speakers and styles', () => {
    const n = castLine(story, story.panels[0].lines[0], 'hi', voices, {})!; const m = castLine(story, story.panels[0].lines[2], 'hi', voices, {})!;
    expect(n.speaker).not.toBe(m.speaker); expect(n.description).toContain('storyteller'); expect(m.description).toContain('high-pitched');
    expect(castLine(story, story.panels[1].lines[0], 'hi', voices, {})!.description).toContain('thoughtful');
  });
  it('lets Character.voices override the casting', () => {
    const s2 = { ...story, characters: { ...story.characters, mouse: { pitch: 1.7, voices: { hi: { speaker: 'Aman', style: 'tiny and squeaky' } } } } };
    const c = castLine(s2, s2.panels[0].lines[2], 'hi', voices, {})!; expect(c.speaker).toBe('Aman'); expect(c.description).toContain('tiny and squeaky');
  });
  it('returns nothing for a language without a free model (Punjabi stays on browser speech)', () => {
    expect(castLine(story, story.panels[0].lines[0], 'pa', voices, {})).toBeNull();
  });
});
describe('job planning and cache keys', () => {
  const o = { voices, modelId: 'm', codec: 'mp3', settings: voices.settings };
  it('skips sound effects and gives stable hashes', () => {
    const a = planJobs(story, 'hi', o); const b = planJobs(story, 'hi', o);
    expect(a.map((j) => j.lineId)).toEqual(['p1l1', 'p1l3', 'p2l1']); expect(a.map((j) => j.hash)).toEqual(b.map((j) => j.hash));
    expect(a.find((j) => j.lineId === 'p1l3')!.lastInPanel).toBe(true);
  });
  it('changes the hash only when model, voice, style, text or lexicon change', () => {
    const base = planJobs(story, 'hi', o)[0].hash;
    expect(planJobs(story, 'hi', { ...o, modelId: 'other' })[0].hash).not.toBe(base);
    expect(planJobs(story, 'hi', { ...o, lexicon: { hi: { राजा: 'राज़ा' } } })[0].hash).not.toBe(base);
    expect(planJobs(story, 'hi', { ...o, lexicon: { hi: { नहीं: 'x' } } })[0].hash).toBe(base);
    expect(hashKey('a', 'b')).not.toBe(hashKey('ab'));
  });
});
describe('wav joining', () => {
  it('inserts the requested pause between sentences', () => {
    const w = (ms: number) => wavFrom(Buffer.alloc((24000 * ms) / 1000 * 2), 24000);
    expect(wavDurationMs(joinWithPauses([w(500), w(500)], 250))).toBe(1250);
  });
});
describe('npm run audio is idempotent (stub backend)', () => {
  it('generates once and never regenerates unchanged lines', () => {
    const dir = mkdtempSync(join(tmpdir(), 'cg-audio-'));
    const env = { ...process.env, AUDIO_OUT: join(dir, 'out'), AUDIO_CACHE: join(dir, 'cache') };
    const run = () => execFileSync('node', ['scripts/generate-audio.mjs', '--backend', 'stub', '--codec', 'wav', '--story', 'lion-hare', '--lang', 'en'], { env, encoding: 'utf8' });
    const first = run(); expect(first).toMatch(/\d+ to generate/); expect(first).not.toMatch(/, 0 to generate/);
    const files = readdirSync(join(dir, 'out/lion-hare/en')); expect(files.length).toBeGreaterThan(5);
    const mt = files.map((f) => statSync(join(dir, 'out/lion-hare/en', f)).mtimeMs);
    expect(run()).toMatch(/, 0 to generate/);
    expect(files.map((f) => statSync(join(dir, 'out/lion-hare/en', f)).mtimeMs)).toEqual(mt);
    expect(existsSync(join(dir, 'out/manifest.json'))).toBe(true);
  }, 30000);
});
