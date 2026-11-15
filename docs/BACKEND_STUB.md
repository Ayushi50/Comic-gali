# Submission backend (stub)

The site runs without a backend. Submissions are kept in the visitor’s browser (IndexedDB) and, if `VITE_SUBMIT_ENDPOINT` is set at build time, also POSTed as JSON:

```json
{ "id": "uuid", "title": "", "creator": "", "email": "", "lang": "en", "license": "CC BY 4.0",
  "panelText": "", "pages": ["data:image/png;base64,…"], "status": "pending", "at": 1731670000000 }
```

For production, implement:

1. `POST /api/submissions` — validate (size, image type), store pages in object storage, create a `pending` row. Rate-limit; scan uploads.
2. `GET /api/submissions?status=pending` and `PATCH /api/submissions/:id` — **admin only**, behind real authentication.
3. On approval, write a `Story` JSON (see `src/types.ts`) and a catalog entry with `rights: "creator_submitted"` and the creator’s chosen licence, then publish.
4. Email the creator on approval/rejection; keep the consent record (checkbox text, timestamp, IP hash).

The page `/moderation` in this repo is a local-only prototype and **must not be deployed as the admin tool**.
