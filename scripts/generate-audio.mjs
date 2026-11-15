#!/usr/bin/env node
// Offline neural TTS for our own stories. Runs on the developer's machine; the output is committed as static files under public/audio/.
//   npm run audio -- --dry-run                 show what would be generated (needs no model, no ffmpeg)
//   npm run audio -- --story monkey-crocodile --lang hi
//   npm run audio -- --compare                 same 3 lines per language per candidate model -> .cache-audio/compare/
// Idempotent: a line's file name is hash(model + speaker + style + normalised text + codec + settings); existing files are never regenerated.
// Requires: ffmpeg on PATH, and for --backend parler: python3 with torch/transformers/parler-tts (see scripts/tts/parler_synth.py).
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { hashKey, joinWithPauses, parseWav, planJobs, splitSentences, wavFrom, wavDurationMs } from './lib/audio-core.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const flag = (n) => args.includes(`--${n}`);
const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : d; };
const voices = JSON.parse(readFileSync(join(root, 'content-src/voices.json'), 'utf8'));
const { settings } = voices;
const backendName = opt('backend', 'parler');
const only = { story: opt('story'), lang: opt('lang') };
const cache = process.env.AUDIO_CACHE ?? join(root, '.cache-audio'); // env overrides are for tests
const outRoot = process.env.AUDIO_OUT ?? join(root, 'public/audio');
const manifestPath = join(outRoot, 'manifest.json');
const modelId = backendName === 'parler' ? voices.models.parler.id : backendName === 'piper' ? voices.models.piper.id : 'stub';
const codec = opt('codec', settings.codec);

const stories = readdirSync(join(root, 'public/content/stories')).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(readFileSync(join(root, 'public/content/stories', f), 'utf8')))
  .filter((s) => !only.story || s.id === only.story);
const lexicon = (id) => { const p = join(root, 'content-src/lexicon', `${id}.json`); return existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : {}; };

// ---------- backends: synth(jobs[{key,text,description,speaker,lang}]) -> writes <cache>/wav/<key>.wav ----------
const wavDir = join(cache, 'wav'); mkdirSync(wavDir, { recursive: true });
const backends = {
  async stub(jobs) { // test backend: a quiet tone whose length follows the text. Not speech.
    for (const j of jobs) { const rate = 24000, n = Math.round(rate * Math.max(0.6, j.text.length * 0.055)); const pcm = Buffer.alloc(n * 2);
      for (let i = 0; i < n; i++) pcm.writeInt16LE(Math.round(Math.sin((i / rate) * 2 * Math.PI * 220) * 3000), i * 2);
      writeFileSync(join(wavDir, `${j.key}.wav`), wavFrom(pcm, rate)); }
  },
  async parler(jobs) {
    const jf = join(cache, 'jobs.json'); writeFileSync(jf, JSON.stringify(jobs.map(({ key, text, description }) => ({ key, text, description }))));
    const r = spawnSync('python3', [join(root, 'scripts/tts/parler_synth.py'), jf, wavDir], { stdio: 'inherit' });
    if (r.status !== 0) throw new Error('parler_synth.py failed (see its header for setup: pip packages + accepting the gated model on Hugging Face)');
  },
  async piper(jobs) {
    if (!flag('allow-unverified-licence') && !flag('compare')) throw new Error('Piper voice licences are not verified in voices.json. Verify each voice card, then pass --allow-unverified-licence.');
    for (const j of jobs) {
      const model = voices.models.piper.voices[j.lang]; if (!model) throw new Error(`no piper voice for ${j.lang}`);
      const r = spawnSync('piper', ['--model', model, '--output_file', join(wavDir, `${j.key}.wav`)], { input: j.text, stdio: ['pipe', 'inherit', 'inherit'] });
      if (r.status !== 0) throw new Error('piper failed (pip install piper-tts; voices download via `python3 -m piper.download_voices <name>`)');
    }
  },
};
const synth = backends[backendName]; if (!synth) { console.error('unknown --backend', backendName); process.exit(2); }

function haveFfmpeg() { if (codec === 'wav') return true; try { execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' }); return true; } catch { return false; } }
/** trim silence, loudness-normalise to ~-16 LUFS, mono, small file. */
function encode(wavPath, outPath) {
  if (codec === 'wav') { writeFileSync(outPath, readFileSync(wavPath)); return; } // test mode: no ffmpeg
  const af = `silenceremove=start_periods=1:start_threshold=-50dB:stop_periods=1:stop_threshold=-50dB:stop_duration=0.5,loudnorm=I=${settings.targetLufs}:TP=-1.5:LRA=11`;
  const c = codec === 'opus' ? ['-c:a', 'libopus', '-b:a', `${settings.bitrateK}k`] : ['-c:a', 'libmp3lame', '-b:a', `${settings.bitrateK}k`];
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', wavPath, '-af', af, '-ac', '1', '-ar', String(settings.sampleRate), ...c, outPath]);
}
/** Synthesize a line sentence-by-sentence (cached per sentence) and join with natural pauses. */
async function renderLine(job, mid = modelId, be = synth) {
  const sents = splitSentences(job.text);
  const keyOf = (t) => hashKey(mid, job.speaker, job.description, t);
  const todo = sents.map((text) => ({ key: keyOf(text), text, description: job.description, speaker: job.speaker, lang: job.lang })).filter((x) => !existsSync(join(wavDir, `${x.key}.wav`)));
  if (todo.length) await be(todo);
  return joinWithPauses(sents.map((t) => readFileSync(join(wavDir, `${keyOf(t)}.wav`))), settings.sentencePauseMs);
}

const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : { version: 1, reviewed: {}, entries: {} };

// ---------- compare mode ----------
if (flag('compare')) {
  if (!haveFfmpeg()) { console.error('ffmpeg is required (brew install ffmpeg)'); process.exit(1); }
  const src = stories[0]; const rows = [];
  for (const lang of Object.keys(voices.languages).filter((l) => !only.lang || l === only.lang)) {
    const lines = src.panels.flatMap((p) => p.lines).filter((l) => l.kind !== 'sfx' && l.text[lang]).slice(0, 3);
    for (const [name, be] of [['parler', backends.parler], ['piper', backends.piper]]) {
      if (name === 'piper' && !voices.models.piper.voices[lang]) continue;
      for (const [i, l] of lines.entries()) {
        const job = planJobs({ ...src, panels: [{ lines: [l] }] }, lang, { voices, modelId: name, codec, settings })[0]; if (!job) continue;
        const dir = join(cache, 'compare', lang); mkdirSync(dir, { recursive: true });
        const out = join(dir, `${name}-${i + 1}.${codec}`);
        try { const tmp = join(cache, 'tmp.wav'); writeFileSync(tmp, await renderLine(job, name, be)); encode(tmp, out); rows.push({ lang, model: name, n: i + 1, text: job.text, file: `${lang}/${name}-${i + 1}.${codec}` }); }
        catch (e) { console.error(`✗ ${name}/${lang}: ${e.message}`); }
      }
    }
  }
  const html = `<!doctype html><meta charset=utf-8><title>Voice comparison</title><style>body{font:16px system-ui;max-width:900px;margin:2rem auto}td{padding:6px;vertical-align:top;border-bottom:1px solid #ddd}</style><h1>Voice comparison</h1><p>Rate each clip for naturalness 1–5 and record the pick per language in DECISIONS.md.</p><table>${rows.map((r) => `<tr><td>${r.lang}</td><td>${r.model} #${r.n}</td><td lang="${r.lang}">${r.text}</td><td><audio controls preload=none src="${r.file}"></audio></td></tr>`).join('')}</table>`;
  writeFileSync(join(cache, 'compare', 'index.html'), html);
  console.log(`wrote ${join(cache, 'compare/index.html')} (${rows.length} clips)`); process.exit(0);
}

// ---------- normal mode ----------
const plan = [];
for (const s of stories) for (const lang of s.langs.filter((l) => !only.lang || l === only.lang)) {
  if (!voices.languages[lang]) { console.log(`- ${s.id}/${lang}: no free model qualifies (stays on browser speech)`); continue; }
  const jobs = planJobs(s, lang, { voices, castings: voices.castings, lexicon: lexicon(s.id), modelId, codec, settings });
  for (const j of jobs) {
    const line = s.panels.flatMap((p) => p.lines).find((l) => l.id === j.lineId);
    const existing = line?.audio?.[lang];
    if (existing && !existing.startsWith(`/audio/${s.id}/`)) continue; // a human recording: never overridden
    plan.push(j);
  }
}
const pending = plan.filter((j) => !existsSync(join(outRoot, j.story, j.lang, j.file)));
console.log(`${plan.length} lines planned, ${plan.length - pending.length} up to date, ${pending.length} to generate (backend: ${backendName}, model: ${modelId})`);
if (flag('dry-run')) { for (const j of pending.slice(0, 12)) console.log(`  ${j.story}/${j.lang}/${j.lineId} [${j.speaker} · ${j.archetype}] ${j.text.slice(0, 60)}`); process.exit(0); }
if (pending.length && !haveFfmpeg()) { console.error('ffmpeg is required for encoding (brew install ffmpeg). Nothing generated.'); process.exit(1); }
if (backendName === 'parler' && !voices.models.parler.licenseVerified) { console.error('Model licence not verified in voices.json'); process.exit(1); }

for (const j of pending) {
  const dir = join(outRoot, j.story, j.lang); mkdirSync(dir, { recursive: true });
  const tmp = join(cache, 'line.wav'); writeFileSync(tmp, await renderLine(j));
  encode(tmp, join(dir, j.file));
  console.log('✓', `${j.story}/${j.lang}/${j.lineId}`, `${wavDurationMs(readFileSync(tmp))}ms`);
}
// manifest: every planned line -> its file (so build-content can patch `audio[lang]`); keep entries of filtered-out stories/langs
for (const j of plan) manifest.entries[`${j.story}/${j.lang}/${j.lineId}`] = { file: j.file, hash: j.hash, model: modelId, speaker: j.speaker, archetype: j.archetype };
if (flag('prune')) {
  const keep = new Set(Object.entries(manifest.entries).map(([k, v]) => `${k.split('/')[0]}/${k.split('/')[1]}/${v.file}`));
  for (const s of readdirSync(outRoot, { withFileTypes: true }).filter((d) => d.isDirectory())) for (const l of readdirSync(join(outRoot, s.name))) for (const f of readdirSync(join(outRoot, s.name, l))) if (!keep.has(`${s.name}/${l}/${f}`)) rmSync(join(outRoot, s.name, l, f));
}
let total = 0; const walk = (d) => { for (const e of readdirSync(d, { withFileTypes: true })) e.isDirectory() ? walk(join(d, e.name)) : e.name !== 'manifest.json' && (total += statSync(join(d, e.name)).size); };
mkdirSync(outRoot, { recursive: true }); walk(outRoot);
manifest.bytes = total; manifest.generated = new Date().toISOString().slice(0, 10); manifest.models = { ...(manifest.models ?? {}), [modelId]: voices.models[backendName]?.license ?? '' };
writeFileSync(manifestPath, JSON.stringify(manifest, null, 1));
console.log(`audio total ${(total / 1e6).toFixed(1)} MB (budget ${voices.budget.maxTotalMB} MB). Now run: npm run content`);
if (total / 1e6 > voices.budget.maxTotalMB) { console.error('over the audio size budget'); process.exit(1); }
