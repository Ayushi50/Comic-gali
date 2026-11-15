# Security notes

**Reporting:** email the address in `TAKEDOWN_EMAIL`/the site footer with "security" in the subject.

## What the API enforces (all in `functions/_lib`, covered by `tests/backend-*.test.ts`)
- **Auth:** email magic link (15 min, single use, stored hashed) and Google OAuth (state cookie). Sessions are random ids stored **hashed** in D1; the cookie is HMAC-signed, `HttpOnly; Secure; SameSite=Lax`, 30 days.
- **Roles** (`reader`, `creator`, `moderator`, `admin`) are checked server-side on every protected route (`perms.ts` + `requireCan`). Hiding a button is never the control. `ADMIN_EMAIL` is admin at login; admins can change roles.
- **CORS / CSRF:** `Access-Control-Allow-Origin` only for `SITE_ORIGIN`; every non-GET request must carry that exact `Origin`.
- **Uploads:** page count/size caps, image type by **magic bytes** (PNG/JPEG/WebP only, no SVG), audio by magic bytes; files live in a private R2 bucket; moderators preview through short-lived **HMAC-signed URLs**; only published pages are public. Media responses carry a `sandbox` CSP and `nosniff`.
- **Abuse:** Turnstile (free) on submit and takedown; per-IP and per-email rate limits in D1; daily caps with a friendly "try later" 503 so free quotas are never exhausted.
- **Privacy:** IPs are stored only as a salted SHA-256 in the consent record. Emails are never public.
- **Input:** text fields are stripped of control characters and angle brackets and length-capped; emails render as escaped text; SQL always uses bound parameters.
- **Headers:** `public/_headers` (CSP, HSTS, frame-ancestors none, nosniff, referrer policy) plus the same security headers on API responses.
- **Audit:** every moderation action, role change, recording upload and takedown is written to `audit_log`.

## Known limits
- D1 has no row-level security; a bug in `app.ts` is a data bug. Keep routes few and tested.
- Session cookies are not bound to a device. Revoke by deleting rows in `sessions`.
- Magic-link email via Resend's free tier needs a verified sending domain to reach arbitrary addresses (see BACKEND.md).
