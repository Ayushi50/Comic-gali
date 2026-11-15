import type { BucketLike, D1Like } from './db';

function toB64(b: Uint8Array): string {
  let s = ''; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000));
  return btoa(s);
}
function fromB64(s: string): Uint8Array { const bin = atob(s); const out = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i); return out; }

/** BucketLike backed by the D1 `blobs` table: free, no card. Max ~1.4 MB per object (D1's 2 MB row limit). */
export class D1Bucket implements BucketLike {
  constructor(private db: D1Like) {}
  async put(key: string, body: ArrayBuffer | Uint8Array, o?: { httpMetadata?: { contentType?: string } }) {
    const bytes = body instanceof Uint8Array ? body : new Uint8Array(body);
    await this.db.prepare('INSERT INTO blobs (key,mime,b64,bytes,created_at) VALUES (?,?,?,?,?) ON CONFLICT(key) DO UPDATE SET mime=excluded.mime, b64=excluded.b64, bytes=excluded.bytes')
      .bind(key, o?.httpMetadata?.contentType ?? 'application/octet-stream', toB64(bytes), bytes.length, Date.now()).run();
  }
  async get(key: string) {
    const r = await this.db.prepare('SELECT mime, b64 FROM blobs WHERE key=?').bind(key).first<{ mime: string; b64: string }>();
    if (!r) return null;
    const data = fromB64(r.b64);
    return { body: data, arrayBuffer: async () => data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer, httpMetadata: { contentType: r.mime } };
  }
  async delete(key: string) { await this.db.prepare('DELETE FROM blobs WHERE key=?').bind(key).run(); }
}
