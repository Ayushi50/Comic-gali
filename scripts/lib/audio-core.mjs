// Pure helpers for the offline audio generator (unit-tested in tests/audio-core.test.ts).
import { createHash } from 'node:crypto';

export const hashKey = (...parts) => createHash('sha256').update(JSON.stringify(parts)).digest('hex').slice(0, 16);

const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
export function numberToWordsEn(n) {
  if (n < 20) return ONES[n];
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? '-' + ONES[n % 10] : '');
  if (n < 1000) return ONES[Math.floor(n / 100)] + ' hundred' + (n % 100 ? ' and ' + numberToWordsEn(n % 100) : '');
  if (n < 1e6) return numberToWordsEn(Math.floor(n / 1000)) + ' thousand' + (n % 1000 ? ' ' + numberToWordsEn(n % 1000) : '');
  return String(n);
}
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** Pronunciation fixes as data: { "from": "to" } applied on whole words (Unicode-aware). Longest keys first. */
export function applyLexicon(text, lex = {}) {
  let out = text;
  for (const k of Object.keys(lex).sort((a, b) => b.length - a.length)) out = out.replace(new RegExp(`(?<![\\p{L}\\p{M}])${escapeRe(k)}(?![\\p{L}\\p{M}])`, 'gu'), lex[k]);
  return out;
}
/** Text normalisation before synthesis: punctuation, numbers, onomatopoeia (via lexicon), a closing sentence mark. */
export function normalizeText(text, lang, lex = {}) {
  let t = String(text).normalize('NFC')
    .replace(/[“”„«»]/g, '"').replace(/[‘’]/g, "'")
    .replace(/\*+|_{2,}/g, '')
    .replace(/॥/g, '।')
    .replace(/\s*(\.{3}|…)\s*/g, ', ')           // ellipsis -> a short pause
    .replace(/\s*[—–]\s*/g, ', ')                 // dashes -> a short pause
    .replace(/\s+/g, ' ').trim();
  t = applyLexicon(t.replace(/[,\s]+$/, ''), lex);
  if (lang === 'en') t = t.replace(/\b\d{1,6}\b/g, (m) => numberToWordsEn(Number(m)));
  if (!/[.!?।]["')]?$/.test(t)) t += lang === 'en' ? '.' : '।';
  return t;
}
/** Sentence split used for synthesis so the model never gets a long paragraph and pauses can be controlled. */
export function splitSentences(text, max = 220) {
  const parts = text.match(/[^.!?।]+[.!?।]*["')]*\s*/g) ?? [text];
  const out = [];
  for (const raw of parts) { let p = raw.trim(); while (p.length > max) { let c = p.lastIndexOf(',', max); if (c < max / 2) c = p.lastIndexOf(' ', max); if (c < 1) c = max; out.push(p.slice(0, c + 1).trim()); p = p.slice(c + 1).trim(); } if (p) out.push(p); }
  return out;
}

export const STYLES = {
  narrator: 'warm, calm and expressive, like a storyteller reading to children, with a slow pace and gentle intonation',
  child: 'high-pitched, bright, lively and curious, with a slightly fast pace',
  elder: 'deep, slow and slightly husky, wise and measured',
  trickster: 'playful and sly, with quick, sing-song intonation and a mischievous tone',
  adult_m: 'clear, natural and expressive, with a moderate pitch and pace',
  adult_f: 'clear, natural and expressive, with a moderate pitch and pace',
  thought: 'quiet and thoughtful, as if speaking to oneself, slightly slower',
};
/** Which archetype a character is: explicit casting > heuristic from the existing pitch/gender hints. */
export function archetypeFor(story, charId, castings = {}) {
  if (!charId) return 'narrator';
  const explicit = castings[story.id]?.[charId];
  if (explicit) return explicit;
  const c = story.characters[charId] ?? {};
  if ((c.pitch ?? 1) >= 1.4) return 'child';
  if ((c.pitch ?? 1) <= 0.8) return 'elder';
  return c.voice === 'f' ? 'adult_f' : 'adult_m';
}
const ARCH_SPEAKER = { narrator: 'narrator', child: 'child', elder: 'elder', trickster: 'trickster', adult_m: 'male', adult_f: 'female' };
/** Resolve speaker + Parler-style description for a line. A Character.voices[lang] entry overrides everything. */
export function castLine(story, line, lang, voices, castings) {
  const cfg = voices.languages[lang]; if (!cfg) return null;
  const ch = line.speaker ? story.characters[line.speaker] : undefined;
  const arch = line.kind === 'thought' && line.speaker ? 'thought' : archetypeFor(story, line.speaker, castings);
  const baseArch = arch === 'thought' ? archetypeFor(story, line.speaker, castings) : arch;
  const key = ARCH_SPEAKER[baseArch];
  const speaker = ch?.voices?.[lang]?.speaker ?? cfg.cast[key] ?? cfg.cast[key === 'child' || key === 'trickster' ? 'female' : 'male'] ?? cfg.cast.narrator;
  const style = ch?.voices?.[lang]?.style ?? STYLES[arch] ?? STYLES.adult_m;
  const description = `${speaker}'s voice is ${style}. The recording is of very high quality, with the speaker's voice sounding clear and very close up, with no background noise.`;
  return { speaker, description, archetype: arch };
}
/** One synthesis job per speakable line, with its cache hash. */
export function planJobs(story, lang, { voices, castings = {}, lexicon = {}, modelId, codec = 'mp3', settings }) {
  const jobs = [];
  story.panels.forEach((p, pi) => {
    const speakable = p.lines.filter((l) => l.kind !== 'sfx' && (l.text[lang] ?? (lang === 'en' ? l.text.en : undefined)));
    speakable.forEach((l, i) => {
      const cast = castLine(story, l, lang, voices, castings); if (!cast) return;
      const text = normalizeText(l.text[lang], lang, lexicon[lang]);
      const lastInPanel = i === speakable.length - 1;
      const hash = hashKey(modelId, cast.speaker, cast.description, text, codec, settings);
      jobs.push({ story: story.id, lang, panel: pi, lineId: l.id, text, ...cast, lastInPanel, hash, file: `${hash}.${codec}` });
    });
  });
  return jobs;
}
// ---- minimal 16-bit PCM WAV helpers (backends emit WAV) ----
export function parseWav(buf) {
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  if (buf.toString('ascii', 0, 4) !== 'RIFF') throw new Error('not a WAV');
  let off = 12, rate = 24000, ch = 1, bits = 16, data = null;
  while (off + 8 <= buf.length) {
    const id = buf.toString('ascii', off, off + 4), size = view.getUint32(off + 4, true);
    if (id === 'fmt ') { ch = view.getUint16(off + 10, true); rate = view.getUint32(off + 12, true); bits = view.getUint16(off + 22, true); }
    if (id === 'data') { data = buf.subarray(off + 8, off + 8 + size); break; }
    off += 8 + size + (size % 2);
  }
  if (!data || bits !== 16) throw new Error('need 16-bit PCM WAV');
  return { rate, channels: ch, pcm: data };
}
export function wavFrom(pcm, rate, channels = 1) {
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVEfmt ', 8); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(channels, 22);
  h.writeUInt32LE(rate, 24); h.writeUInt32LE(rate * channels * 2, 28); h.writeUInt16LE(channels * 2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}
/** Join sentence WAVs with silence between them (natural pauses). All inputs must share a sample rate. */
export function joinWithPauses(wavs, pauseMs) {
  const parsed = wavs.map(parseWav); const rate = parsed[0].rate;
  if (parsed.some((p) => p.rate !== rate || p.channels !== 1)) throw new Error('sample-rate/channel mismatch between sentences');
  const gap = Buffer.alloc(Math.round((rate * pauseMs) / 1000) * 2);
  const parts = []; parsed.forEach((p, i) => { if (i) parts.push(gap); parts.push(p.pcm); });
  return wavFrom(Buffer.concat(parts), rate);
}
export const wavDurationMs = (wav) => { const p = parseWav(wav); return Math.round((p.pcm.length / 2 / p.rate) * 1000); };
