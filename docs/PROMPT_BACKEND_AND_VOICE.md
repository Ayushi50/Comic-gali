# Prompt: free backend + free natural voice for Comic Gali

Paste everything below the line into Claude Code, run from `Comic-gali/`.

---

You are finishing **Comic Gali**, a Vite + React + TypeScript site for reading and listening to Indian comics and illustrated stories. The front end works. Your job: (A) a real backend, (B) a natural human-sounding Listen experience, (C) the remaining gaps.

## HARD CONSTRAINT: everything must be free
Total running cost must be **₹0 / $0**, with no credit card required for any service you choose. That applies to hosting, database, auth, email, file storage, and above all audio. Do not use any paid API (no Azure/Google Cloud/ElevenLabs/OpenAI TTS, no paid tiers). If a free tier needs a card, pick something else. If something cannot be done free, say so, do the free subset, and list it in the report. Before using any service or model, **check its current free-tier limits and licence on its official page** and record them in `DECISIONS.md`; do not rely on memory. Commercial use must be allowed; reject non-commercial licences (e.g. CC BY-NC) for anything the public site serves.

## Read first
`README.md`, `DECISIONS.md`, `MORNING_REPORT.md`, `docs/BACKEND_STUB.md`, `src/types.ts`, `src/lib/{speech,audio-queue,useListen,submissions,storage,data,offline}.ts`, `src/pages/{SignIn,Submit,Moderation,Listen,Static}.tsx`. Do not redesign the UI. Keep existing tests green, add tests for new logic, commit in small steps, never commit secrets (add `.env.example`). The site must still run fully static with no backend configured, as it does today.

## Part A: Free backend

**Default stack (change only with a recorded reason):** the Cloudflare free tier: Pages (hosting) + Pages Functions (API in `functions/`) + D1 (SQLite database) + R2 (user-uploaded files, no egress fees) + Turnstile (free anti-spam instead of CAPTCHA services). It does not pause on inactivity. Fallback if you find a blocker: Supabase free tier (note it pauses after inactivity) with Vercel Hobby. Email: Resend or Brevo free tier, or Cloudflare Email Routing for inbound takedowns; check the current limits.

1. **Schema** (SQL migrations in `migrations/`): profiles, titles, stories, submissions, submission_pages, consents (text, timestamp, hashed IP), favourites, reading_positions, takedown_requests, audit_log. Enforce access in the API code (D1 has no row-level security), with tests.
2. **Auth:** replace the fake sign-in with free real auth: email magic link and/or Google OAuth, sessions in D1 using signed, httpOnly, SameSite cookies. Keep "continue without signing in". Roles: reader, creator, moderator, admin (admin set by env var for the first account). Sync favourites and reading position to the account when signed in; merge local data on first login.
3. **Content:** serve catalog and stories from D1 when the API is configured, otherwise from `public/content/` as today. Keep `scripts/build-content.mjs`; add `scripts/publish-content.mjs` to upsert validated content.
4. **Submissions:** `POST /api/submissions` with server-side validation (size caps well under free-tier limits, image type by magic bytes, page-count cap), Turnstile check, per-IP rate limit, stored in R2, consent record saved. Flow: pending → approved/rejected → published.
5. **Moderation:** put `/moderation` behind real auth with a server-enforced role check (not just hidden UI). Approve/reject with reason, preview via signed URLs, audit log. Approval creates the Story JSON and a catalog entry with `rights: "creator_submitted"` and the creator's chosen licence.
6. **Email + takedown:** emails for submission received / approved / rejected, and a working takedown form that stores the request, emails the owner, and lets a moderator unpublish in one action. Replace `takedown@comicgali.example` with an env value.
7. **Safety:** CORS locked to the site origin, security headers, input sanitising, short `docs/SECURITY.md`. Stay inside free quotas: add caps and a friendly "try later" response when a quota is near.
8. **Docs/tests:** unit tests for validators and permission checks, an integration test for submit → approve → publish, and `docs/BACKEND.md` with setup steps, env vars and a deploy checklist (replacing `BACKEND_STUB.md`).

## Part B: Free, natural-sounding Listen

Problem: `src/lib/speech.ts` uses default browser voices, which sound robotic and are missing for many Indian languages. Two free fixes, in this priority order. The player already prefers a per-line `audio` URL over browser speech, so keep that as the single source of truth.

### B1. Use free audio that already exists (research first, then use only what truly fits)
Search for existing free recordings and check each licence individually: Internet Archive, LibriVox, Wikimedia Commons / Wikisource audio, StoryWeaver read-along audio, NDLI, Archive.org Indian-language folk-tale audio, Pratham/Sandhya-type open readings. Use a clip **only if** (a) the licence allows reuse and redistribution (public domain, CC0, CC BY, CC BY-SA; **never** NC or "all rights reserved"), and (b) the recording's text actually matches a story we publish. Note: our 8 stories are original retellings, so most existing recordings will not match them. Therefore:
- Write `scripts/find-free-audio.mjs` or a documented research list in `SOURCES.md` of candidate public-domain/CC stories that **have** existing free audio (e.g. Panchatantra / Jataka / Vikram-Betaal readings), with licence, URL and language per item.
- Add those as new catalog titles (text from the matching free source, audio attached per line or per whole recording), crediting author, reader and licence in the existing credits fields. Add a `kind: "whole"` audio option (one long file with panel timestamps) in `src/types.ts` if per-line audio does not fit, and support it in the audio queue.
- Do not re-host anything whose licence you could not verify. Record every decision.

### B2. Generate free neural audio for our own stories, locally, once
Run open-source text-to-speech on the developer's own machine (or a free Colab/Hugging Face notebook) and commit the output as static files under `public/audio/`, so serving is free and no TTS service runs in production.
- Evaluate and pick per language from open models with commercial-friendly licences, verified on their model cards. Candidates to check: **AI4Bharat Indic Parler-TTS** (Apache-2.0, many Indian languages, controllable speaker/style), **Piper** voices (MIT, offline, fast, limited Indic coverage), AI4Bharat Indic-TTS / VITS models. Do **not** use models with non-commercial licences (e.g. Meta MMS-TTS is CC BY-NC; Coqui XTTS is non-commercial). Do not use unofficial scraping of Google Translate, Edge or any online TTS endpoint; that violates terms.
- Produce a small comparison set (the same 3 lines per language per candidate model) and pick the most natural per language. Record which language has no acceptable free model and leave that language on browser speech.
- Voice casting: give the narrator a warm storyteller voice and each character a distinct voice/style (child, elder, trickster). Extend `Character` in `src/types.ts` with an optional per-language voice/style map used by the generator.
- Make it sound human: expressive style prompts where the model supports them, natural pauses between sentences, a longer breath at panel boundaries, text normalisation (numbers, Indic punctuation, onomatopoeia), loudness-normalise to about -16 LUFS, trim silence, encode small mono Opus/MP3 with ffmpeg.
- `npm run audio` must be idempotent (cache key = hash of model + voice + style + text), support `--story` and `--lang` filters, patch each line's `audio[lang]` URL into the story JSON, and never regenerate unchanged lines. Keep total audio size within the free host's limits; report the size.

### B3. Make browser speech much better as the free fallback
- Rank available browser voices and prefer natural/neural ones (on Edge and Chrome these are the "Online (Natural)" / network voices, which are free in the browser). Prefer a locally-matching language voice, then a regional one, and show a one-line tip on how to install better voices if only a robotic one exists.
- Tune rate/pitch gently (slightly slower narration), split long text at sentence boundaries, add pauses between lines, and avoid the Chrome long-utterance cut-off bug.

### B4. Player improvements (free, no service)
- Prefer audio file, then browser voice; show a small "device voice" hint when falling back.
- Preload the next two clips for gapless playback, use one reused audio element (iOS autoplay restrictions), Media Session API for lock-screen controls and background play, `preservesPitch` so slowing down does not deepen voices.
- Keep highlight sync, sleep timer, panel skip and driving mode working; extend `tests/audio-queue.test.ts` for preload and fallback.
- Offline: make "Save for offline" cache the audio files too and show the size.
- Let a moderator or creator upload a **human recording** (to R2) that overrides generated audio for a line or story.
- Pronunciation fixes as data: a per-title lexicon file applied before generation. Add a review page that plays each clip beside its text for native speakers. Until a language is reviewed, label it "AI voice, unreviewed" in the UI.

## Part C: Remaining items
- Takedown address and domain from env config.
- Fix: balloons covering characters in panel mode; top bar scrolling sideways on narrow phones; replace data-URL previews with stored files.
- Complete UI strings for languages that fall back to English, flagged as machine-translated and needing native review.
- Verify in Safari and Firefox, a real offline test of the service worker, keyboard and screen-reader pass; list anything you could not verify.
- Free CI (GitHub Actions): install, test, build, content validation.
- Update `README.md`, `MORNING_REPORT.md`, `DECISIONS.md` and `SOURCES.md` at the end.

## Done means
1. `npm test` and `npm run build` pass; CI is green.
2. Total monthly cost is zero, and `DECISIONS.md` lists every service with its free limit and licence.
3. With env vars set: sign in, submit, moderate, publish and listen end to end. With none: the site runs static as before.
4. Listen uses free file-based audio where available (existing free recordings or locally generated neural audio) with distinct character voices and no gaps; browser speech is only the fallback.
5. A final report says exactly what was verified in a real browser, what was not, and what I must do by hand (accounts, keys, licensing emails, native-speaker review).
