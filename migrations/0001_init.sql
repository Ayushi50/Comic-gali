-- Comic Gali schema (Cloudflare D1 / SQLite). Access control is enforced in functions/_lib (D1 has no RLS).
CREATE TABLE profiles (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  role TEXT NOT NULL DEFAULT 'reader' CHECK (role IN ('reader','creator','moderator','admin')),
  created_at INTEGER NOT NULL
);
CREATE TABLE sessions (
  id_hash TEXT PRIMARY KEY,          -- SHA-256 of the random session id (the cookie holds the id, signed)
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX sessions_user ON sessions(user_id);
CREATE TABLE login_tokens (
  token_hash TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  used INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE titles (
  id TEXT PRIMARY KEY,
  catalog_json TEXT NOT NULL,        -- one CatalogItem
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published','unpublished')),
  rights TEXT NOT NULL,
  submission_id TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE TABLE stories (
  title_id TEXT PRIMARY KEY REFERENCES titles(id) ON DELETE CASCADE,
  json TEXT NOT NULL,                -- one Story
  updated_at INTEGER NOT NULL
);
CREATE TABLE submissions (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES profiles(id),
  title TEXT NOT NULL,
  creator TEXT NOT NULL,
  email TEXT NOT NULL,
  lang TEXT NOT NULL,
  license TEXT NOT NULL,
  panel_text TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','published')),
  reason TEXT,
  reviewer_id TEXT REFERENCES profiles(id),
  title_id TEXT,
  created_at INTEGER NOT NULL,
  reviewed_at INTEGER
);
CREATE INDEX submissions_status ON submissions(status, created_at);
CREATE TABLE submission_pages (
  id TEXT PRIMARY KEY,
  submission_id TEXT NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  idx INTEGER NOT NULL,
  r2_key TEXT NOT NULL,
  mime TEXT NOT NULL,
  bytes INTEGER NOT NULL
);
CREATE TABLE consents (
  id TEXT PRIMARY KEY,
  submission_id TEXT NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  user_id TEXT,
  text TEXT NOT NULL,
  at INTEGER NOT NULL,
  ip_hash TEXT NOT NULL               -- salted SHA-256, never the raw IP
);
CREATE TABLE favourites (
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title_id TEXT NOT NULL,
  at INTEGER NOT NULL,
  PRIMARY KEY (user_id, title_id)
);
CREATE TABLE reading_positions (
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title_id TEXT NOT NULL,
  json TEXT NOT NULL,                -- {index, lang, mode, dir}
  at INTEGER NOT NULL,
  PRIMARY KEY (user_id, title_id)
);
CREATE TABLE takedown_requests (
  id TEXT PRIMARY KEY,
  title_id TEXT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','actioned','dismissed')),
  handled_by TEXT,
  created_at INTEGER NOT NULL,
  handled_at INTEGER
);
CREATE TABLE audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_id TEXT,
  action TEXT NOT NULL,
  target TEXT,
  detail TEXT,
  at INTEGER NOT NULL
);
CREATE TABLE rate_limits (
  key TEXT NOT NULL,
  bucket INTEGER NOT NULL,
  n INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (key, bucket)
);
CREATE TABLE recordings (            -- human recordings that override generated audio
  id TEXT PRIMARY KEY,
  title_id TEXT NOT NULL,
  line_id TEXT,                      -- NULL = whole-story recording
  lang TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  uploader_id TEXT NOT NULL,
  at INTEGER NOT NULL
);
