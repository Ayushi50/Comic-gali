-- Card-free file storage: uploaded page images and recordings live in D1 (R2 needs a payment card to enable).
-- Stored as base64 text so any D1 driver round-trips them; D1 rows are limited to 2 MB, hence the 1.4 MB file cap.
CREATE TABLE blobs (
  key TEXT PRIMARY KEY,
  mime TEXT NOT NULL,
  b64 TEXT NOT NULL,
  bytes INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
