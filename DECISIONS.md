# Decisions

Made autonomously; change any of them.

1. **Design source.** The first mockups I invented were rejected as childish. The final UI is the supplied design “E” (`comic-gali-site.zip`): teal/coral/ink palette, Fraunces + Inter, Hinglish copy. I ported it to React and kept its tokens, covers, nav and page structure. The earlier explorations are kept in `docs/explorations/`.
2. **Stack.** Vite + React + TypeScript, plain CSS (the design’s tokens as CSS variables), React Router, Vitest. No UI library. No backend.
3. **Name.** Kept “Comic Gali” — it fits the design and the brief.
4. **Original art only.** Page art is procedural SVG: characters and scenes in `src/art/` were invented for this project. Covers are the zip’s abstract CSS covers. No third-party character, logo or cover appears.
5. **Content is original retellings** of folk tales and Jatakas, not copies of any printed edition (see SOURCES.md). Eight titles, eight panels each, to keep quality checkable.
6. **Story format.** Each panel carries `lines[]` with `kind` (narration / speech / thought / sfx), `speaker`, per-language `text`, and an optional per-language `audio` URL. When a recording exists, it plays instead of text-to-speech. Sound-effect lines are visual only.
7. **Page layout.** Pages are 800×1120 design units with four panels in one of three layouts. The same markup serves page-flip (fit the page), panel-by-panel (camera zoom to a panel rectangle) and vertical scroll (panels stacked). Right-to-left mirrors panel positions and swaps arrow keys and swipe direction.
8. **Voices.** Browser Web Speech only. Characters get pitch/rate and a gender hint; a voice is chosen from what the browser offers for that language. If none exists, the UI says so. Tamil was confirmed on this Mac (“Vani”); other languages depend on the device.
9. **UI language** is separate from content language: Hinglish (the design’s default), English and Hindi (Devanagari) are fully translated; other UI strings fall back to English. All ten languages work for story content and the library filter.
10. **“Comics” vs “Kahaniyan”.** In the design, Comics are licensed series and Kahaniyan are stories. So “Comics” shows the coming-soon licensed titles and “Kahaniyan” the readable ones.
11. **Sign-in is a stub.** It stores a display name on the device and says so. No passwords are collected.
12. **Submissions** are saved in the browser’s IndexedDB, with a moderation page and an optional `VITE_SUBMIT_ENDPOINT` POST. The moderation page has no authentication (documented in `docs/BACKEND_STUB.md`).
13. **Offline.** A hand-written service worker (no plugin) caches the app shell, hashed assets, content and fonts. “Save for offline” stores a title’s JSON and any recorded audio in a dedicated cache.
14. **Sound** is synthesized with Web Audio (street murmur, glass clink, page rustle), off by default.
15. **Truck-art / stall concept** from the brief was dropped in favour of the supplied design; the “dhak-dhak” tap feedback (a quick press animation plus a short vibration) and page-peel animation were kept.
16. **Dark mode** follows the system on first visit; a toggle remembers the choice.
