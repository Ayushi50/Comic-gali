# Report: backend, natural Listen, and remaining items

Everything below is free: no paid service, and no card is needed for any plan the code uses. See `DECISIONS.md` for each service's limit and licence (read 2026-11-15).

## Verified (automated, run in this session)
- `npm test`: **58 tests pass** (reader state; audio queue incl. preload, line/panel gaps, device-vs-file source, whole-recording slices; voice ranking and sentence splitting; audio-pipeline text normalisation, casting, hashing and idempotency; backend validators, permissions, signed cookies/URLs; full **submit → approve → publish**, reject, takedown → unpublish, sync merge, rate limit, daily-cap 503, Turnstile, CORS/CSRF, forged-cookie rejection). The backend tests run the real SQL migrations on SQLite (`node:sqlite`) with in-memory R2.
- `npm run build` passes (type-check, content validation, production build). CI workflow is written (`.github/workflows/ci.yml`) but **has not run on GitHub** (nothing is pushed), so "CI is green" is not yet shown.
- `npm run audio` is idempotent (second run: 0 to generate) using the test backend.

## Verified in a real browser (the app's built-in Chromium-based pane)
- Reader at 375 px: the top bar no longer scrolls sideways (scrollWidth 375 = viewport) and balloons no longer cover the lion, deer or hare in the first page.

## NOT verified (be honest about these)
- **Nothing was run against real Cloudflare** (no account): D1/R2/Turnstile/Resend/Google calls, the `wrangler` config, `_headers` CSP and the 10 ms CPU limit on multipart uploads are untested. Expect small first-deploy fixes.
- **No neural audio has been generated.** This machine has no ffmpeg, no GPU model setup and no Hugging Face login. The pipeline, casting, normalisation, caching and player support are built and tested, but `public/audio/` is empty, so the site still uses browser voices today. The model comparison listening test and per-language pick were **not done**.
- **No existing free recording was ingested** (see `SOURCES.md` for the candidates, notably LibriVox Jataka / More Jataka / Jacobs' *Indian Fairy Tales*). Alignment of text to recording needs a human pass.
- **Service-worker offline test: not possible here**; the in-app browser refused to register a service worker. The Range-request (206) handler and audio offline pack code are untested in a browser.
- Safari, Firefox, iOS autoplay, Media Session lock-screen controls, screen-reader and keyboard walk-through: **not tested**. Lighthouse was not re-run after the changes.
- Hindi UI strings are machine-written (flagged in the footer); other languages' story text is still unreviewed AI translation.

## What you must do by hand
1. **Accounts:** Cloudflare (D1, R2, Pages, Turnstile), Resend (verify a sending domain), optionally Google OAuth. Create resources and secrets per `docs/BACKEND.md`; pick the real `TAKEDOWN_EMAIL` and domain.
2. **Run the audio once** on a machine with ffmpeg + Python: accept the gated Indic Parler-TTS model on Hugging Face, `npm run audio:compare`, listen, record the pick in `DECISIONS.md`, then `npm run audio`, `npm run content`, check size, commit `public/audio/`. Punjabi stays on browser speech.
3. **Licensing:** send the emails in `LICENSING/`; before using any LibriVox/StoryWeaver audio re-read the licence on the item page. Have a lawyer glance at the Parler-TTS training-data licences for commercial use.
4. **Native-speaker review** of story translations and generated clips (`/review/<title>?lang=xx`), then list the reviewer in `public/audio/manifest.json` under `reviewed`.
5. Push to GitHub and confirm CI is green; test in Safari, Firefox and a phone; do the offline test on a real deploy.

## What changed (summary)
- **Backend:** `functions/` API, `migrations/0001_init.sql`, magic-link + Google sign-in with hashed server sessions, roles with `ADMIN_EMAIL`, submissions with magic-byte validation / Turnstile / rate limits / quotas, signed-URL previews, moderation with reasons + audit log, takedown form + one-click unpublish, emails, CORS/CSRF, security headers, `docs/BACKEND.md`, `docs/SECURITY.md`.
- **Front end:** real sign-in page (+ "continue without signing in"), account sync, new Submit/Moderation/Takedown flows with a static fallback (Files in IndexedDB instead of data URLs), reader for image-page comics, `/review` page, Hindi strings completed.
- **Listen:** ranked browser voices + install tip, sentence-split speech, panel breath, preload, reused audio element, Media Session, `preservesPitch`, device-voice hint, "AI voice, unreviewed" label, offline packs include audio and show size, `Story.audioWhole`, `Character.voices`.
- **Fixes:** balloons vs. characters, narrow top bar, `takedown@comicgali.example` removed (env-driven).

## Known gaps
- Creator-submitted stories get a plain panel-less scene; panels come only from the optional "Speaker: text" box. Submitted pages are not auto-compressed in the browser (2.5 MB cap each).
- A static-catalog title cannot be unpublished from the API (the UI says to remove it and redeploy).
- Whole-story human recordings are not supported by the upload form (per-line only).
