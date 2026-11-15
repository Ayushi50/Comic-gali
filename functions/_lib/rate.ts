import { HttpError } from './http';
import type { Env } from './db';

/** Fixed-window counter in D1. Throws 429 over the limit. Keys: e.g. `submit:<ip-hash>`. */
export async function rateLimit(env: Env, key: string, limit: number, windowSec: number, nowMs = Date.now()) {
  const bucket = Math.floor(nowMs / 1000 / windowSec);
  await env.DB.prepare('INSERT INTO rate_limits (key,bucket,n) VALUES (?,?,1) ON CONFLICT(key,bucket) DO UPDATE SET n = n + 1').bind(key, bucket).run();
  const row = await env.DB.prepare('SELECT n FROM rate_limits WHERE key=? AND bucket=?').bind(key, bucket).first<{ n: number }>();
  if ((row?.n ?? 0) > limit) throw new HttpError(429, 'Too many requests. Please try again in a little while.', { retryAfter: windowSec });
  if (Math.random() < 0.02) await env.DB.prepare('DELETE FROM rate_limits WHERE bucket < ?').bind(bucket - 2).run().catch(() => undefined);
}
/** Free-tier guard: a day-wide cap so we never hit Cloudflare's hard daily limits. Friendly 503 when near. */
export async function dailyQuota(env: Env, name: string, cap: number, nowMs = Date.now()) {
  const day = Math.floor(nowMs / 86_400_000);
  await rateLimit(env, `quota:${name}:${day}`, cap, 86_400, nowMs).catch((e) => {
    if (e instanceof HttpError && e.status === 429) throw new HttpError(503, 'Comic Gali is very busy today and has paused new uploads. Please try again tomorrow.', { retryAfter: 3600 });
    throw e;
  });
}
