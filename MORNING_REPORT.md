# Morning report

## What works (checked in a real browser)
- `npm install && npm run dev` runs; production build passes; 13 unit tests pass (reader state, audio queue).
- UI follows the supplied design: home (cover fan, shelves, Padho / Suno panels, Kahaniyan list, closing band, “continue” ticket), library (search, filters for language / genre / age / rights, favourites, continue card), title page (credits, licence, source, per-language read/listen links, favourite, offline pack), reader, listen player, sign-in, light/dark.
- **4 titles readable and listenable** (8 panels each): Monkey and the Crocodile (en, hi, ta, mr), Banyan Deer (en, hi, bn), Birbal and the Crows (en, hi, gu), Tenali Rama and the Thieves (en, hi, te, kn).
- **14 “coming soon” shelves** with no publisher art or text.
- Reader: page-flip with a peel animation, panel-by-panel camera zoom, vertical scroll; LTR/RTL; pinch, drag-pan, swipe, keyboard; position remembered.
- Listen: browser voices; per-character pitch; active balloon highlighted; speed, panel skip, sleep timer, auto-advance, driving mode (big buttons, wake lock). Verified playing in Tamil with the Mac’s “Vani” voice; highlight followed the line.
- Hindi, Tamil, Telugu and Hindi-script text rendered correctly with Noto fonts. Mobile (375px) reader checked.
- Submit page → moderation queue (browser-local), takedown page, sources page, PWA service worker, sound toggle (synth ambience, off by default).
- Lighthouse (mobile, headless): home 100/100/100, reader 100/100/100.

## Placeholder or not done
- **Translations are AI-written and unreviewed** (Hindi, Tamil, Marathi, Bengali, Gujarati, Telugu, Kannada). Get native speakers to check them.
- **Content volume:** 4 titles, not a full catalog. No Panchatantra/Hitopadesha/Vikram–Betaal/epics yet. **StoryWeaver was not ingested** (needs per-story licence checks). Internet Archive / NDLI / Wikisource were not searched in depth.
- **Art** is procedural SVG: clean but simple. Real illustrators would lift it. Covers are the design’s abstract shapes.
- **Sign-in is fake** (stores a name locally). **Moderation and submissions are browser-local** with no authentication — not safe to deploy as an admin tool. See `docs/BACKEND_STUB.md`.
- **Voices:** quality and availability depend on the visitor’s device; many phones lack Bengali/Marathi/Gujarati voices. The UI warns when none is found.
- **UI strings:** Hinglish, English, Hindi are complete; other UI languages fall back to English (content works in all ten).
- **Creative brief items dropped:** the truck-art “stall” concept (replaced by your design), spinning rack, parallax shelves. Kept: tap feedback, page peel, ticket-style continue card, sound.
- Not checked: Safari/Firefox, a real offline test of the service worker, screen-reader walkthrough, multi-device pinch on a touchscreen.

## What you must do next
1. **Send the licensing emails** in `LICENSING/` after verifying each current rights-holder and contact. Replace the bracketed parts.
2. **Set a real takedown email** (currently `takedown@comicgali.example` in `src/pages/Static.tsx`) and a domain.
3. **Native-speaker review** of every translation; fix typos in `content-src/stories/`.
4. Decide on a backend for submissions, real auth and a protected moderation tool.
5. Commission or record real audio if you want better voices (`audio` field per line).
6. Ingest more public-domain/CC titles (see SOURCES.md for candidates) and verify each licence.

## Known issues
- In panel mode, balloons sometimes cover characters; scenes were laid out quickly.
- Top bar scrolls sideways on very narrow phones.
- Moderation preview stores page images as data URLs in IndexedDB (fine for a prototype, heavy at scale).
- Nothing has been committed to a remote; the git repo is local.
