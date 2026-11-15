# Comic Gali

A home for Indian comics and illustrated stories you can **read and listen to**. The UI is the supplied design “E” (teal / coral / ink, Fraunces + Inter), ported to React.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # reader state + audio queue unit tests
npm run build      # type-check, validate content, production build into dist/
npm run preview    # serve dist/ on :4173 (service worker only runs in a production build)
```

Node 18+ (developed on Node 26).

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
| Docs | `SOURCES.md`, `DECISIONS.md`, `MORNING_REPORT.md`, `LICENSING/`, `docs/` |

## Adding a story

1. Copy `content-src/stories/monkey-crocodile.mjs`. Each panel has a scene (`bg`, `actors`), alt text, and lines with text per language.
2. Add an entry to `scripts/make-catalog.mjs` (credits, licence, source) and run `node scripts/make-catalog.mjs`.
3. `npm run content` validates that every line has text in every listed language, then writes the JSON.

**Recorded audio:** add `audio: { hi: '/audio/monkey/p1l1.mp3' }` to a line; the player uses it instead of text-to-speech.

## Deploy

- **Vercel:** import the repo; build command `npm run build`, output `dist`. `vercel.json` rewrites routes to `index.html`.
- **Netlify:** same settings; `public/_redirects` handles routing.
- Optional env: `VITE_SUBMIT_ENDPOINT` to POST submissions (see `docs/BACKEND_STUB.md`).

## Keyboard (reader)

Arrows / Space / PageUp-Down: turn (arrows swap in RTL) · `+` `-` `0`: zoom · `m`: change mode · `l` or `p`: play/pause listening.

## Accessibility

Skip link, labelled controls, focus rings, reduced-motion support (animations are removed), real text in balloons (screen readers read panel alt text and balloons), dyslexia-friendly font toggle (Atkinson Hyperlegible, wider spacing), light/dark. Lighthouse (mobile, headless Chrome): home and reader 100 / 100 / 100 for performance, accessibility and best practices; the title page scored 96 on accessibility before a link-underline fix.
