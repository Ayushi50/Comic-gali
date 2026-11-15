/** The slice of the D1 API we use (also implemented over node:sqlite in tests). */
export interface D1Stmt {
  bind(...a: unknown[]): D1Stmt;
  first<T = unknown>(): Promise<T | null>;
  all<T = unknown>(): Promise<{ results: T[] }>;
  run(): Promise<{ meta?: { changes?: number } }>;
}
export interface D1Like { prepare(sql: string): D1Stmt; batch(s: D1Stmt[]): Promise<unknown[]>; }
export interface BucketLike {
  put(key: string, body: ArrayBuffer | Uint8Array, o?: { httpMetadata?: { contentType?: string } }): Promise<unknown>;
  get(key: string): Promise<{ body: unknown; arrayBuffer(): Promise<ArrayBuffer>; httpMetadata?: { contentType?: string } } | null>;
  delete(key: string): Promise<unknown>;
}
export interface Env {
  DB: D1Like;
  BUCKET: BucketLike;
  SITE_ORIGIN: string;              // e.g. https://comicgali.pages.dev  (CORS + links in emails)
  SESSION_SECRET: string;           // >= 32 random chars
  ADMIN_EMAIL?: string;             // first admin account
  TAKEDOWN_EMAIL?: string;          // owner inbox for takedowns
  EMAIL_FROM?: string;
  RESEND_API_KEY?: string;
  TURNSTILE_SECRET?: string;
  TURNSTILE_SITE_KEY?: string;      // public, returned by /api/config
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  IP_SALT?: string;
  DAILY_SUBMISSION_CAP?: string;    // default 40
  DAILY_WRITE_CAP?: string;         // default 20000 (D1 free: 100k rows written/day)
}
export const now = () => Date.now();
export const uid = () => crypto.randomUUID();
export async function audit(env: Env, actor: string | null, action: string, target?: string, detail?: unknown) {
  await env.DB.prepare('INSERT INTO audit_log (actor_id, action, target, detail, at) VALUES (?,?,?,?,?)')
    .bind(actor, action, target ?? null, detail == null ? null : JSON.stringify(detail), now()).run();
}
