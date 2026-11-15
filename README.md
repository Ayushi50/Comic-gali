# Comic Gali

A home for Indian comics and illustrated stories you can **read and listen to**. The UI is the supplied design “E” (teal / coral / ink, Fraunces + Inter), ported to React.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # reader, audio queue, voices, audio pipeline, backend validators + submit→approve→publish
npm run build      # type-check, validate content, production build into dist/
npm run preview    # serve dist/ on :4173 (service worker only runs in a production build)
```

Node 22.5+ (backend tests use `node:sqlite`; developed on Node 26). CI uses Node 24.

## What is in it

| Area | Where |
| --- | --- |
| Pages: home, library, title, reader, listen, sign-in, submit, moderation, takedown, sources | `src/pages/` |
| Reader (page-flip, panel-by-panel, vertical scroll; LTR/RTL; pinch/keyboard/swipe) | `src/pages/Reader.tsx`, `src/lib/reader-state.ts` |
| Listen (queue, speed, panel skip, sleep timer, auto-advance, driving mode) | `src/lib/audio-queue.ts`, `src/lib/speech.ts`, `src/lib/useListen.ts`, `src/components/Driving.tsx` |
| Original SVG art | `src/art/` |
| Stories (authoring format) | `content-src/stories/*.mjs` → `public/content/stories/*.json` |
| Catalog (rights, credits, licences) | `scripts/make-catalog.mjs` → `content-src/catalog.json` → `public/content/catalog.json` |
| Offline + PWA | `public/sw.js`, `public/manifest.webmanifest`, `src/lib/offline.ts` |
| Free backend (optional) | `functions/`, `migrations/`, `wrangler.toml`, `docs/BACKEND.md`, `docs/SECURITY.md` |
| Generated voices | `scripts/generate-audio.mjs`, `content-src/voices.json`, `content-src/lexicon/`, `public/audio/` |
| Native-speaker review | `/review/<title>?lang=xx` (`src/pages/Review.tsx`) |
| Docs | `SOURCES.md`, `DECISIONS.md`, `MORNING_REPORT.md`, `LICENSING/`, `docs/` |

## Adding a story

1. Copy `content-src/stories/monkey-crocodile.mjs`. Each panel has a scene (`bg`, `actors`), alt text, and lines with text per language.
2. Add an entry to `scripts/make-catalog.mjs` (credits, licence, source) and run `node scripts/make-catalog.mjs`.
3. `npm run content` validates that every line has text in every listed language, then writes the JSON.

**Audio:** the player prefers a file in `line.audio[lang]` over the device voice. Generate natural voices once, locally, and commit them:

```bash
npm run audio -- --dry-run                       # plan, no model needed
npm run audio:compare                            # same 3 lines per language per model, listen and pick
npm run audio -- --story lion-hare --lang hi     # idempotent; unchanged lines are never regenerated
npm run content                                  # patches audio URLs into the story JSON
```

Needs ffmpeg and Indic Parler-TTS (setup at the top of `scripts/tts/parler_synth.py`). Pronunciation fixes live in `content-src/lexicon/<story>.json`; voice casting per character in `content-src/voices.json` or `Character.voices`.

## Deploy

- **Static only:** any static host (Cloudflare Pages, Vercel, Netlify). Build `npm run build`, output `dist`. No env needed.
- **With the free backend:** Cloudflare Pages + D1 + R2 + Turnstile; follow `docs/BACKEND.md` and set `VITE_API=1` at build time. Env templates: `.env.example`, `.dev.vars.example`. Never commit real secrets.
- **CI:** `.github/workflows/ci.yml` runs content validation, tests, build and the audio manifest check.

## Keyboard (reader)

Arrows / Space / PageUp-Down: turn (arrows swap in RTL) · `+` `-` `0`: zoom · `m`: change mode · `l` or `p`: play/pause listening.

## Accessibility

Skip link, labelled controls, focus rings, reduced-motion support (animations are removed), real text in balloons (screen readers read panel alt text and balloons), dyslexia-friendly font toggle (Atkinson Hyperlegible, wider spacing), light/dark. Lighthouse (mobile, headless Chrome): home and reader 100 / 100 / 100 for performance, accessibility and best practices; the title page scored 96 on accessibility before a link-underline fix.
