# Backend (Cloudflare free tier)

Optional. With no backend the site runs fully static (`npm run build` → `dist/`) exactly as before. Setting `VITE_API=1` at build time turns on: sign-in, account sync, creator submissions, real moderation, takedown form, human-recording overrides and API-published titles.

**Stack:** Cloudflare Pages (hosting) + Pages Functions (`functions/`) + D1 (SQLite, `migrations/`) + R2 (uploads) + Turnstile (anti-spam) + Resend (email). Everything is free and none of it needs a credit card on the plans used here (verify at signup; see `DECISIONS.md` for limits and the date they were read).

## Layout

```
functions/api/[[path]].ts   Pages Function entry → functions/_lib/app.ts (router + handlers)
functions/_lib/             perms, validate, crypto (signed cookies/URLs), rate limits, email, content builder
migrations/0001_init.sql    profiles, sessions, titles, stories, submissions, submission_pages, consents,
                            favourites, reading_positions, takedown_requests, audit_log, rate_limits, recordings
scripts/publish-content.mjs upsert validated static catalog/stories into D1 (optional)
tests/backend-*.test.ts     validators, permissions, full submit → approve → publish flow on real SQL (node:sqlite)
```

D1 has no row-level security; every access rule lives in `functions/_lib/perms.ts` + `requireCan(...)` in `app.ts`, and is tested.

## One-time setup

```bash
npm install
npx wrangler login
npx wrangler d1 create comic-gali              # copy database_id into wrangler.toml
npx wrangler r2 bucket create comic-gali-files
npx wrangler d1 migrations apply comic-gali --remote
npx wrangler pages project create comic-gali --production-branch main
```

Then:

1. **Turnstile** (dash.cloudflare.com → Turnstile → add widget for your domain): note the site key (public) and secret.
2. **Email:** create a Resend account, verify your sending domain (without a verified domain Resend only delivers to your own address, which is fine for testing). Create an API key.
3. **Google sign-in (optional):** Google Cloud Console → OAuth client (Web). Redirect URI `https://<site>/api/auth/google/callback`. Needs no billing.
4. **Secrets:**

```bash
npx wrangler pages secret put SESSION_SECRET      # 32+ random chars: openssl rand -base64 48
npx wrangler pages secret put RESEND_API_KEY
npx wrangler pages secret put TURNSTILE_SECRET
npx wrangler pages secret put GOOGLE_CLIENT_SECRET   # if using Google
npx wrangler pages secret put IP_SALT
```

5. **Plain variables** (Pages → Settings → Variables, or `wrangler.toml [vars]`): `SITE_ORIGIN` (exact https origin, no trailing slash), `ADMIN_EMAIL` (the first account that signs in with this address becomes admin), `TAKEDOWN_EMAIL`, `EMAIL_FROM` (`Comic Gali <hello@yourdomain>`), `TURNSTILE_SITE_KEY`, `GOOGLE_CLIENT_ID`, optional `DAILY_SUBMISSION_CAP`.
6. **Build env** (Pages → Settings → Environment variables, build): `VITE_API=1`, `VITE_TAKEDOWN_EMAIL` (shown if the API is down).
7. **Deploy:** connect the GitHub repo (build command `npm run build`, output `dist`) or `npm run build && npx wrangler pages deploy dist`.

## Environment variables

| Name | Where | Required | Purpose |
| --- | --- | --- | --- |
| `SESSION_SECRET` | secret | yes | HMAC key for cookies and signed preview URLs (≥ 32 chars; API refuses to run without it) |
| `SITE_ORIGIN` | var | yes | only origin allowed by CORS/CSRF; base of email links |
| `ADMIN_EMAIL` | var | yes | account that is always `admin` |
| `TAKEDOWN_EMAIL` | var | recommended | receives takedown requests; shown on /takedown |
| `EMAIL_FROM`, `RESEND_API_KEY` | var, secret | for email | magic links and submission/takedown mails (without them mail is skipped, magic link sign-in is hidden) |
| `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET` | var, secret | recommended | anti-spam on submit and takedown (skipped when no secret) |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | var, secret | optional | Google sign-in |
| `IP_SALT` | secret | optional | salt for hashed IPs in consent records (defaults to `SESSION_SECRET`) |
| `DAILY_SUBMISSION_CAP` | var | optional | default 40/day, protects free quotas |
| `VITE_API`, `VITE_TAKEDOWN_EMAIL`, `VITE_TURNSTILE_SITE_KEY` | build | see above | front-end switches; see `.env.example` |

Local: copy `.dev.vars.example` → `.dev.vars`, then `npx wrangler d1 migrations apply comic-gali --local && VITE_API=1 npm run build && npx wrangler pages dev dist`.

## Flows

- **Sign in:** `POST /api/auth/magic` → emailed single-use 15-minute link → `/api/auth/verify` sets the session cookie. Google: `/api/auth/google`. "Continue without signing in" always works. On first sign-in local favourites/positions are merged into the account (`/api/me/sync`, newest position wins) and kept in sync afterwards.
- **Submit:** `POST /api/submissions` (multipart): Turnstile → per-IP limit (5/h) → daily cap → field + page validation (≤ 12 pages, ≤ 2.5 MB each, ≤ 16 MB total, PNG/JPEG/WebP by magic bytes) → files to R2 `sub/…`, row `pending`, consent row (text, time, salted IP hash), receipt email.
- **Moderate:** `/moderation` (moderator/admin only, enforced server-side). Preview via 10-minute signed URLs. **Approve** copies pages to public `pub/…`, builds the Story JSON (from the "Speaker: text" panel text) and a catalog entry with `rights: "creator_submitted"` and the creator's licence, status `published`, emails the creator. **Reject** needs a reason and emails it. Everything is in `audit_log`.
- **Takedown:** `POST /api/takedown` stores the request, emails `TAKEDOWN_EMAIL` and the requester. A moderator presses "Unpublish title and close" (one action; static catalog titles must also be removed from `content-src/` and redeployed, the UI says so).
- **Human recordings:** moderators (any title) and creators (own titles) upload per-line recordings to R2; the player prefers them over generated audio.
- **Audit/roles:** admins can read `/api/audit` and set roles via `POST /api/admin/role`.

## Quotas guarded (free plans)

Workers/Pages Functions 100,000 requests/day and 10 ms CPU per request; D1 5 M rows read / 100 k rows written per day; R2 10 GB, 1 M Class A / 10 M Class B ops per month; Resend 100 mails/day, 3,000/month. The API caps submissions/recordings per day and answers with a friendly **503 "try again tomorrow"** before limits are hit. Static pages, content and audio are served by Pages as unlimited static requests.

**Known risk:** the 10 ms CPU limit on the Free plan may be tight for multi-megabyte multipart uploads. If you see "exceeded CPU" errors, lower `maxPageBytes` in `functions/_lib/validate.ts`, or move uploads to direct-to-R2 presigned PUTs. This was not load-tested (no Cloudflare account was available).

## Deploy checklist

- [ ] D1 and R2 created, ids in `wrangler.toml`, migrations applied `--remote`
- [ ] All secrets and variables set; `SITE_ORIGIN` exactly matches the live origin
- [ ] Turnstile widget hostnames include the live domain
- [ ] Resend domain verified (SPF/DKIM) and a test magic link received
- [ ] Sign in as `ADMIN_EMAIL`; `/api/auth/me` shows `admin`
- [ ] Submit a test work, approve it in `/moderation`, open the published title, unpublish it via a test takedown
- [ ] Reader and Listen work for a static title and the published one
- [ ] `public/_headers` CSP still allows everything you added; check the browser console
- [ ] `npm test`, `npm run build`, CI green

## Fallback stack

If Cloudflare is a blocker: Supabase free tier (Postgres + Auth + Storage, pauses after inactivity, no card) with Vercel Hobby hosting. The handlers in `app.ts` use a tiny D1 surface (`prepare/bind/first/all/run/batch`), so porting is a storage-adapter change plus Postgres RLS. Not implemented; no blocker was found.
