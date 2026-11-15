# Decisions

Made autonomously; change any of them.

1. **Design source.** The first mockups I invented were rejected as childish. The final UI is the supplied design “E” (`comic-gali-site.zip`): teal/coral/ink palette, Fraunces + Inter, Hinglish copy. I ported it to React and kept its tokens, covers, nav and page structure. The earlier explorations are kept in `docs/explorations/`.
2. **Stack.** Vite + React + TypeScript, plain CSS (the design’s tokens as CSS variables), React Router, Vitest. No UI library. An optional free backend (decision 17) is enabled with `VITE_API=1`; without it the site is static.
3. **Name.** Kept “Comic Gali” — it fits the design and the brief.
4. **Original art only.** Page art is procedural SVG: characters and scenes in `src/art/` were invented for this project. Covers are the zip’s abstract CSS covers. No third-party character, logo or cover appears.
5. **Content is original retellings** of folk tales and Jatakas, not copies of any printed edition (see SOURCES.md). Eight titles, eight panels each, to keep quality checkable.
6. **Story format.** Each panel carries `lines[]` with `kind` (narration / speech / thought / sfx), `speaker`, per-language `text`, and an optional per-language `audio` URL. When a recording exists, it plays instead of text-to-speech. Sound-effect lines are visual only.
7. **Page layout.** Pages are 800×1120 design units with four panels in one of three layouts. The same markup serves page-flip (fit the page), panel-by-panel (camera zoom to a panel rectangle) and vertical scroll (panels stacked). Right-to-left mirrors panel positions and swaps arrow keys and swipe direction.
8. **Voices.** Priority: generated/recorded file (`audio[lang]`) → ranked browser voice (decision 20). Device voices are now ranked (natural/neural first), speech is split at sentence ends, narration is slightly slower.
9. **UI language** is separate from content language: Hinglish (the design’s default), English and Hindi (Devanagari) are fully translated; other UI strings fall back to English. All ten languages work for story content and the library filter.
10. **“Comics” vs “Kahaniyan”.** In the design, Comics are licensed series and Kahaniyan are stories. So “Comics” shows the coming-soon licensed titles and “Kahaniyan” the readable ones.
11. **Sign-in:** with the API on, email magic link and/or Google; without it, the local display-name stub. “Continue without signing in” always works.
12. **Submissions:** API on → `POST /api/submissions` into R2/D1 with server-side validation and real, server-enforced moderation. API off → browser-local IndexedDB (stored as Files, no data URLs) with a clearly labelled local-only queue. `VITE_SUBMIT_ENDPOINT` and `docs/BACKEND_STUB.md` were removed.
13. **Offline.** A hand-written service worker (no plugin) caches the app shell, hashed assets, content and fonts. “Save for offline” stores a title’s JSON and any recorded audio in a dedicated cache.
14. **Sound** is synthesized with Web Audio (street murmur, glass clink, page rustle), off by default.
15. **Truck-art / stall concept** from the brief was dropped in favour of the supplied design; the “dhak-dhak” tap feedback (a quick press animation plus a short vibration) and page-peel animation were kept.
16. **Dark mode** follows the system on first visit; a toggle remembers the choice.

## Backend and audio decisions (this pass)

Free-tier facts below were read from the official pages on **2026-11-15** (pages show “last updated” Aug–Nov 2026). Re-check before launch; none of these pages stated a credit-card requirement for the free plan, but confirm at signup.

17. **Backend = Cloudflare free tier** (Pages + Pages Functions + D1 + R2 + Turnstile), as the default stack. No blocker found, so no switch to Supabase.

| Service | Free limit used | Licence / commercial use | Source |
| --- | --- | --- | --- |
| Cloudflare Pages (static) | static requests free and unlimited; 500 builds/month (third-party figure, verify) | service terms; commercial OK | developers.cloudflare.com/pages |
| Pages Functions | share Workers Free: 100,000 requests/day, **10 ms CPU/request**, 50 subrequests, 100 MB body | commercial OK | developers.cloudflare.com/workers/platform/limits, /pages/functions/pricing |
| D1 | 5 M rows read/day, 100 k rows written/day, 5 GB total, 500 MB/db, 10 dbs; queries fail over the daily limit until 00:00 UTC | commercial OK | developers.cloudflare.com/d1/platform/pricing, /limits |
| R2 | 10 GB-month, 1 M Class A, 10 M Class B ops/month, free egress | commercial OK | developers.cloudflare.com/r2/pricing |
| Turnstile | free, unlimited challenges; 20 widgets, 10 hostnames/widget | commercial OK | developers.cloudflare.com/turnstile/plans |
| Resend | 3,000 mails/month and 100/day (search snippets of resend.com docs; official page not opened) | commercial OK; verify card/domain rules at signup | resend.com/docs/knowledge-base/resend-sending-limits |
| Google OAuth | no billing needed for basic sign-in (not re-verified) | Google API terms | console.cloud.google.com |
| GitHub Actions | free minutes on public repos (private repos have a monthly free quota; not re-verified) | — | docs.github.com |

18. **Limits guarded in code:** per-IP limits, a daily cap on submissions (default 40) and recordings (500), page/size caps well below the 100 MB body limit, friendly 503 “try again later”. **Open risk:** 10 ms CPU on multipart uploads was not load-tested.
19. **Server-side everything:** roles checked in `functions/_lib/perms.ts`; `/moderation` is also hidden in the UI but the API is the control. `ADMIN_EMAIL` becomes admin at login.
20. **Browser voices (B3):** voices are scored (exact locale +30, same-language region +10, “Natural/Neural/Online/Enhanced/Premium/Siri” +50, Chrome “Google …” +20, network voice +10, eSpeak/compact −40). The narrator always gets the top voice; characters are cast only from voices within 10 points of it. If only a basic voice exists the UI shows how to install a better one.
21. **Player (B4):** one reused `<audio>` element (iOS autoplay), preload of the next two clips, `preservesPitch`, Media Session lock-screen controls, 280 ms line / 750 ms panel pauses (scaled by speed), automatic fall-back to the device voice if a file fails, “device voice” hint, `kind`-less whole-story recordings via `Story.audioWhole` (panel timestamps).
22. **Offline audio:** “Save for offline” caches the story JSON plus every audio file, whole-story recording and page image, and shows the size. The service worker answers HTTP Range requests from the cache with 206 (Safari requires it for `<audio>`).
23. **Neural TTS model choice (B2).** Chosen: **AI4Bharat Indic Parler-TTS**, licence **Apache-2.0** per its model card (checked 2026-11-15; the card is *gated* — the user must accept its conditions on Hugging Face; an AIKosh listing says MIT, so re-check the card’s LICENSE before launch). Official languages on the card include Hindi, Tamil, Telugu, Bengali, Marathi, Gujarati, Kannada, Malayalam and English; **Punjabi is only “unofficial support”**, so Punjabi stays on browser speech. Named speakers per language are in `content-src/voices.json`; Tamil has only female speakers and Gujarati only two. The model card lists training-data sources with their own licences (GLOBE “CC V1”, IndicTTS, LIMMITS, Rasa CC BY 4.0): confirm with a lawyer that output audio is unencumbered before commercial launch.
    - **Piper (MIT repo licence, archived Oct 2025):** has Hindi (`pratham`, `priyamvada`) and Malayalam (`arjun`, `meera`) voices, but per-voice licences were *not* verified, so the generator refuses to use Piper for production output unless `--allow-unverified-licence` is passed. It is included in `npm run audio:compare` as a candidate.
    - **Rejected:** Meta MMS-TTS (CC BY-NC), Coqui XTTS (non-commercial), any scraping of Google Translate/Edge/online TTS endpoints.
    - **The comparison listening test and the per-language pick have NOT been done** — this environment has no GPU, ffmpeg or Hugging Face login. Run `npm run audio:compare`, listen, and record the winner per language here. Until then Indic Parler-TTS is the working default for every language it supports.
24. **Audio files:** `npm run audio` → `public/audio/<story>/<lang>/<hash>.mp3` (mono 24 kHz MP3, 48 kbps, trimmed, loudnorm −16 LUFS) + `public/audio/manifest.json`; `scripts/build-content.mjs` patches `audio[lang]` into the story JSON. Hash = model + speaker + style + normalised text + codec + settings, so unchanged lines are never regenerated. Size budget 100 MB (CI checks it); Pages allows 20,000 files and 25 MiB per file.
25. **Unreviewed label:** any language that has generated audio and no entry in `manifest.reviewed` shows “AI voice, unreviewed”. Native speakers use `/review/<title>?lang=xx` (clip beside text, notes copied out as JSON); add the reviewer to `manifest.reviewed` when done.
26. **Existing free recordings (B1):** found and listed in `SOURCES.md`, **none ingested** (no matching texts that I could align; licences of some read-alongs are NC/ND). The `audioWhole` format and player support exist for when one is added.
27. **UI strings:** Hindi was missing 24+ keys; they are filled and the footer shows a machine-translation notice in Hindi UI. Other UI languages do not exist (the UI offers Hinglish, English, Hindi); all ten content languages still work.
28. **Layout fixes:** panel art is drawn in the space below the estimated balloon stack, so balloons no longer hide characters; the reader top bar wraps below 560 px instead of scrolling sideways.
