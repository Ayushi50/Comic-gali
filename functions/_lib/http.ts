import type { Env } from './db';

export const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Cross-Origin-Resource-Policy': 'same-origin',
};
export class HttpError extends Error { constructor(public status: number, message: string, public extra: Record<string, unknown> = {}) { super(message); } }

export function json(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...SECURITY_HEADERS, ...headers } });
}
/** The only origin allowed to call the API from a browser. */
export function allowedOrigin(env: Env): string { return env.SITE_ORIGIN.replace(/\/$/, ''); }
export function corsHeaders(req: Request, env: Env): Record<string, string> {
  const o = req.headers.get('origin');
  if (o && o === allowedOrigin(env)) return { 'access-control-allow-origin': o, 'access-control-allow-credentials': 'true', vary: 'Origin' };
  return { vary: 'Origin' };
}
/** CSRF/CORS guard: browser-sent state-changing requests must come from the site origin. */
export function assertSameOrigin(req: Request, env: Env) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return;
  const o = req.headers.get('origin');
  if (o !== allowedOrigin(env)) throw new HttpError(403, 'Forbidden origin');
}
export function parseCookies(req: Request): Record<string, string> {
  const out: Record<string, string> = {};
  for (const p of (req.headers.get('cookie') ?? '').split(';')) { const i = p.indexOf('='); if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim()); }
  return out;
}
export const cookie = (name: string, value: string, maxAge: number, sameSite: 'Lax' | 'Strict' = 'Lax') =>
  `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=${sameSite}; Max-Age=${maxAge}`;
export const clientIp = (req: Request) => req.headers.get('cf-connecting-ip') ?? req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '0.0.0.0';
