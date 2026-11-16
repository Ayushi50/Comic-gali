import { audit, bucketOf, now, uid, type Env } from './db';
import { randomToken, sha256, sign, signUrl, unsign, verifyUrl } from './crypto';
import { sendMail, tpl, type Sender } from './email';
import { HttpError, assertSameOrigin, clientIp, cookie, corsHeaders, json, parseCookies, SECURITY_HEADERS } from './http';
import { buildPublication } from './content';
import { can, isRole, roleFor, type Action, type Role } from './perms';
import { dailyQuota, rateLimit } from './rate';
import { LIMITS, clean, isEmail, slugify, sniffAudio, validatePages, validateSubmissionFields } from './validate';
import type { Lang } from '../../src/types';

export interface Deps { send: Sender; fetch: typeof fetch; now: () => number; }
export const defaultDeps: Deps = { send: sendMail, fetch: (...a) => fetch(...a), now: () => Date.now() };
export interface User { id: string; email: string; name: string | null; role: Role; }

const COOKIE = 'cg_session';
const SESSION_DAYS = 30;
const day = () => new Date().toISOString().slice(0, 10);

export async function currentUser(req: Request, env: Env): Promise<User | null> {
  const raw = parseCookies(req)[COOKIE]; if (!raw) return null;
  const sid = await unsign(env.SESSION_SECRET, raw); if (!sid) return null;
  const row = await env.DB.prepare('SELECT p.id, p.email, p.name, p.role FROM sessions s JOIN profiles p ON p.id = s.user_id WHERE s.id_hash = ? AND s.expires_at > ?')
    .bind(await sha256(sid), now()).first<User>();
  return row ?? null;
}
export function requireCan(user: User | null, action: Action): User {
  if (!user) throw new HttpError(401, 'Sign in required');
  if (!can(user.role, action)) throw new HttpError(403, 'Not allowed');
  return user;
}
async function startSession(env: Env, email: string, name: string | null): Promise<{ user: User; setCookie: string }> {
  email = email.toLowerCase();
  let p = await env.DB.prepare('SELECT id,email,name,role FROM profiles WHERE email=?').bind(email).first<User>();
  if (!p) {
    const role = roleFor(email, undefined, env.ADMIN_EMAIL);
    p = { id: uid(), email, name, role };
    await env.DB.prepare('INSERT INTO profiles (id,email,name,role,created_at) VALUES (?,?,?,?,?)').bind(p.id, email, name, role, now()).run();
  } else {
    const role = roleFor(email, p.role, env.ADMIN_EMAIL);
    if (role !== p.role) { await env.DB.prepare('UPDATE profiles SET role=? WHERE id=?').bind(role, p.id).run(); p = { ...p, role }; }
  }
  const sid = randomToken();
  await env.DB.prepare('INSERT INTO sessions (id_hash,user_id,created_at,expires_at) VALUES (?,?,?,?)').bind(await sha256(sid), p.id, now(), now() + SESSION_DAYS * 864e5).run();
  return { user: p, setCookie: cookie(COOKIE, await sign(env.SESSION_SECRET, sid), SESSION_DAYS * 86400) };
}
async function verifyTurnstile(env: Env, d: Deps, token: string | null, ip: string) {
  if (!env.TURNSTILE_SECRET) return; // not configured: static/dev mode
  if (!token) throw new HttpError(400, 'Please complete the human check.');
  const r = await d.fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: new URLSearchParams({ secret: env.TURNSTILE_SECRET, response: token, remoteip: ip }) });
  const j = (await r.json().catch(() => ({}))) as { success?: boolean };
  if (!j.success) throw new HttpError(400, 'Human check failed. Please try again.');
}
const ipHash = async (env: Env, req: Request) => sha256(`${env.IP_SALT ?? env.SESSION_SECRET}|${clientIp(req)}`);
const num = (v: string | undefined, dflt: number) => (v && Number(v) > 0 ? Number(v) : dflt);

type Ctx = { req: Request; env: Env; d: Deps; url: URL; m: RegExpMatchArray; user: User | null };
type Handler = (c: Ctx) => Promise<Response>;
const routes: [string, RegExp, Handler][] = [];
const route = (method: string, path: string, h: Handler) => routes.push([method, new RegExp(`^${path}$`), h]);

route('GET', '/api/config', async ({ env }) => json({
  takedownEmail: env.TAKEDOWN_EMAIL ?? null, turnstileSiteKey: env.TURNSTILE_SITE_KEY ?? null,
  google: !!env.GOOGLE_CLIENT_ID, magicLink: !!(env.RESEND_API_KEY && env.EMAIL_FROM),
}, 200, { 'cache-control': 'public, max-age=60' }));

// ---------- auth ----------
route('POST', '/api/auth/magic', async ({ req, env, d }) => {
  const b = (await req.json().catch(() => ({}))) as { email?: string };
  const email = clean(b.email, 254).toLowerCase();
  if (!isEmail(email)) throw new HttpError(400, 'Enter a valid email.');
  await rateLimit(env, `magic:${await ipHash(env, req)}`, 8, 3600, d.now());
  await rateLimit(env, `magic-mail:${email}`, 4, 3600, d.now());
  const token = randomToken();
  await env.DB.prepare('INSERT INTO login_tokens (token_hash,email,expires_at) VALUES (?,?,?)').bind(await sha256(token), email, d.now() + 15 * 60_000).run();
  const link = `${env.SITE_ORIGIN.replace(/\/$/, '')}/api/auth/verify?token=${token}`;
  await d.send(env, { to: email, ...tpl.magic(link) });
  return json({ ok: true, message: 'If that address is valid, a sign-in link is on its way.' });
});
route('GET', '/api/auth/verify', async ({ env, url, d }) => {
  const token = url.searchParams.get('token') ?? '';
  const h = await sha256(token);
  const row = await env.DB.prepare('SELECT email, expires_at, used FROM login_tokens WHERE token_hash=?').bind(h).first<{ email: string; expires_at: number; used: number }>();
  if (!row || row.used || row.expires_at < d.now()) return redirect(env, '/signin?error=link');
  const res = await env.DB.prepare('UPDATE login_tokens SET used=1 WHERE token_hash=? AND used=0').bind(h).run();
  if (!res.meta?.changes) return redirect(env, '/signin?error=link');
  const { setCookie } = await startSession(env, row.email, null);
  return redirect(env, '/library', setCookie);
});
route('GET', '/api/auth/google', async ({ env }) => {
  if (!env.GOOGLE_CLIENT_ID) throw new HttpError(404, 'Google sign-in is not configured');
  const state = randomToken(16);
  const p = new URLSearchParams({ client_id: env.GOOGLE_CLIENT_ID, redirect_uri: `${env.SITE_ORIGIN}/api/auth/google/callback`, response_type: 'code', scope: 'openid email profile', state, prompt: 'select_account' });
  return new Response(null, { status: 302, headers: { location: `https://accounts.google.com/o/oauth2/v2/auth?${p}`, 'set-cookie': cookie('cg_oauth', await sign(env.SESSION_SECRET, state), 600), ...SECURITY_HEADERS } });
});
route('GET', '/api/auth/google/callback', async ({ req, env, url, d }) => {
  const state = await unsign(env.SESSION_SECRET, parseCookies(req).cg_oauth ?? '');
  const code = url.searchParams.get('code');
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !state || state !== url.searchParams.get('state') || !code) return redirect(env, '/signin?error=oauth');
  const tr = await d.fetch('https://oauth2.googleapis.com/token', { method: 'POST', body: new URLSearchParams({ code, client_id: env.GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET, redirect_uri: `${env.SITE_ORIGIN}/api/auth/google/callback`, grant_type: 'authorization_code' }) });
  const tok = (await tr.json().catch(() => ({}))) as { access_token?: string };
  if (!tok.access_token) return redirect(env, '/signin?error=oauth');
  const ur = await d.fetch('https://openidconnect.googleapis.com/v1/userinfo', { headers: { authorization: `Bearer ${tok.access_token}` } });
  const info = (await ur.json().catch(() => ({}))) as { email?: string; email_verified?: boolean; name?: string };
  if (!info.email || !info.email_verified) return redirect(env, '/signin?error=oauth');
  const { setCookie } = await startSession(env, info.email, clean(info.name, 80) || null);
  return redirect(env, '/library', setCookie);
});
route('GET', '/api/auth/me', async ({ user }) => json({ user: user && { id: user.id, email: user.email, name: user.name, role: user.role } }));
route('POST', '/api/auth/logout', async ({ req, env }) => {
  const raw = parseCookies(req)[COOKIE]; const sid = raw && (await unsign(env.SESSION_SECRET, raw));
  if (sid) await env.DB.prepare('DELETE FROM sessions WHERE id_hash=?').bind(await sha256(sid)).run();
  return json({ ok: true }, 200, { 'set-cookie': cookie(COOKIE, '', 0) });
});
route('POST', '/api/me/profile', async ({ req, env, user }) => {
  const u = requireCan(user, 'submission.create');
  const b = (await req.json().catch(() => ({}))) as { name?: string };
  await env.DB.prepare('UPDATE profiles SET name=? WHERE id=?').bind(clean(b.name, 30) || null, u.id).run();
  return json({ ok: true });
});
function redirect(env: Env, path: string, setCookie?: string) {
  const h: Record<string, string> = { location: `${env.SITE_ORIGIN.replace(/\/$/, '')}${path}`, ...SECURITY_HEADERS };
  if (setCookie) h['set-cookie'] = setCookie;
  return new Response(null, { status: 302, headers: h });
}

// ---------- sync (favourites / reading position) ----------
route('GET', '/api/me/sync', async ({ env, user }) => { const u = requireAuth(user); return json(await readSync(env, u.id)); });
route('POST', '/api/me/sync', async ({ req, env, user }) => {
  const u = requireAuth(user);
  const b = (await req.json().catch(() => ({}))) as { favs?: unknown; positions?: Record<string, { index: number; lang: string; mode: string; dir: string; at: number }> };
  const favs = Array.isArray(b.favs) ? b.favs.filter((x): x is string => typeof x === 'string' && /^[a-z0-9-]{1,60}$/.test(x)).slice(0, 500) : [];
  for (const f of favs) await env.DB.prepare('INSERT OR IGNORE INTO favourites (user_id,title_id,at) VALUES (?,?,?)').bind(u.id, f, now()).run();
  for (const [id, p] of Object.entries(b.positions ?? {}).slice(0, 200)) {
    if (!/^[a-z0-9-]{1,60}$/.test(id) || typeof p?.index !== 'number' || typeof p.at !== 'number') continue;
    const val = JSON.stringify({ index: Math.max(0, Math.floor(p.index)), lang: clean(p.lang, 5), mode: clean(p.mode, 8), dir: clean(p.dir, 3) });
    await env.DB.prepare('INSERT INTO reading_positions (user_id,title_id,json,at) VALUES (?,?,?,?) ON CONFLICT(user_id,title_id) DO UPDATE SET json=excluded.json, at=excluded.at WHERE excluded.at > reading_positions.at').bind(u.id, id, val, p.at).run();
  }
  return json(await readSync(env, u.id));
});
route('DELETE', '/api/me/favourites/([a-z0-9-]+)', async ({ env, user, m }) => { const u = requireAuth(user); await env.DB.prepare('DELETE FROM favourites WHERE user_id=? AND title_id=?').bind(u.id, m[1]).run(); return json({ ok: true }); });
function requireAuth(u: User | null): User { if (!u) throw new HttpError(401, 'Sign in required'); return u; }
async function readSync(env: Env, uid_: string) {
  const f = await env.DB.prepare('SELECT title_id FROM favourites WHERE user_id=?').bind(uid_).all<{ title_id: string }>();
  const p = await env.DB.prepare('SELECT title_id, json, at FROM reading_positions WHERE user_id=?').bind(uid_).all<{ title_id: string; json: string; at: number }>();
  return { favs: f.results.map((r) => r.title_id), positions: Object.fromEntries(p.results.map((r) => [r.title_id, { ...JSON.parse(r.json), at: r.at }])) };
}

// ---------- content ----------
route('GET', '/api/catalog', async ({ env }) => {
  const r = await env.DB.prepare("SELECT catalog_json FROM titles WHERE status='published' ORDER BY created_at DESC").all<{ catalog_json: string }>();
  return json({ items: r.results.map((x) => JSON.parse(x.catalog_json)) }, 200, { 'cache-control': 'public, max-age=60' });
});
route('GET', '/api/stories/([a-z0-9-]+)', async ({ env, m }) => {
  const r = await env.DB.prepare("SELECT s.json FROM stories s JOIN titles t ON t.id=s.title_id WHERE s.title_id=? AND t.status='published'").bind(m[1]).first<{ json: string }>();
  if (!r) throw new HttpError(404, 'Not found');
  return json(JSON.parse(r.json), 200, { 'cache-control': 'public, max-age=60' });
});
route('GET', '/api/media/(pub|sub|rec)/(.+)', async ({ env, url, m }) => {
  const key = `${m[1]}/${m[2]}`;
  if (m[1] === 'sub' && !(await verifyUrl(env.SESSION_SECRET, url.pathname, url.searchParams.get('exp'), url.searchParams.get('sig')))) throw new HttpError(403, 'Link expired');
  const o = await bucketOf(env).get(key); if (!o) throw new HttpError(404, 'Not found');
  return new Response(o.body as BodyInit, { headers: { 'content-type': o.httpMetadata?.contentType ?? 'application/octet-stream', 'cache-control': m[1] === 'sub' ? 'private, max-age=60' : 'public, max-age=60', ...SECURITY_HEADERS, 'content-security-policy': "default-src 'none'; sandbox" } });
});

// ---------- submissions ----------
route('POST', '/api/submissions', async ({ req, env, d, user }) => {
  const len = Number(req.headers.get('content-length') ?? 0);
  if (len > LIMITS.maxTotalBytes + 500_000) throw new HttpError(413, 'Upload too large.');
  const ih = await ipHash(env, req);
  await rateLimit(env, `submit:${ih}`, 5, 3600, d.now());
  await dailyQuota(env, 'submissions', num(env.DAILY_SUBMISSION_CAP, 40), d.now());
  const form = await req.formData().catch(() => null);
  if (!form) throw new HttpError(400, 'Expected a form upload.');
  await verifyTurnstile(env, d, String(form.get('cf-turnstile-response') ?? '') || null, clientIp(req));
  const fields = Object.fromEntries([...form.entries()].filter(([, v]) => typeof v === 'string'));
  const v = validateSubmissionFields(fields);
  if (!v.ok) throw new HttpError(400, v.error);
  const files = form.getAll('pages').filter((x): x is File => typeof x !== 'string');
  const loaded = await Promise.all(files.map(async (f) => ({ size: f.size, bytes: new Uint8Array(await f.arrayBuffer()) })));
  const pv = validatePages(loaded);
  if (!pv.ok) throw new HttpError(pv.status, pv.error);
  const id = uid(); const t = d.now();
  await env.DB.prepare('INSERT INTO submissions (id,user_id,title,creator,email,lang,license,panel_text,status,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)')
    .bind(id, user?.id ?? null, v.v.title, v.v.creator, v.v.email, v.v.lang, v.v.license, v.v.panelText, 'pending', t).run();
  for (const [i, f] of loaded.entries()) {
    const key = `sub/${id}/${i + 1}.${pv.kinds[i].ext}`;
    await bucketOf(env).put(key, f.bytes, { httpMetadata: { contentType: pv.kinds[i].mime } });
    await env.DB.prepare('INSERT INTO submission_pages (id,submission_id,idx,r2_key,mime,bytes) VALUES (?,?,?,?,?,?)').bind(uid(), id, i, key, pv.kinds[i].mime, f.size).run();
  }
  await env.DB.prepare('INSERT INTO consents (id,submission_id,user_id,text,at,ip_hash) VALUES (?,?,?,?,?,?)').bind(uid(), id, user?.id ?? null, v.v.consentText || 'Creator consent (default text)', t, ih).run();
  if (user && user.role === 'reader') await env.DB.prepare("UPDATE profiles SET role='creator' WHERE id=? AND role='reader'").bind(user.id).run();
  await audit(env, user?.id ?? null, 'submission.create', id);
  await d.send(env, { to: v.v.email, ...tpl.received(v.v.title) });
  return json({ id, status: 'pending' }, 201);
});
route('GET', '/api/submissions', async ({ env, url, user }) => {
  requireCan(user, 'submission.list');
  const st = url.searchParams.get('status') ?? 'pending';
  const rows = await env.DB.prepare(`SELECT id,title,creator,lang,license,status,reason,created_at FROM submissions ${st === 'all' ? '' : 'WHERE status=?'} ORDER BY created_at DESC LIMIT 100`).bind(...(st === 'all' ? [] : [st])).all();
  return json({ items: rows.results });
});
route('GET', '/api/submissions/([0-9a-f-]{36})', async ({ env, user, m }) => {
  requireCan(user, 'submission.preview');
  const s = await env.DB.prepare('SELECT id,title,creator,email,lang,license,panel_text,status,reason,title_id,created_at FROM submissions WHERE id=?').bind(m[1]).first<Record<string, unknown>>();
  if (!s) throw new HttpError(404, 'Not found');
  const pg = await env.DB.prepare('SELECT idx, r2_key FROM submission_pages WHERE submission_id=? ORDER BY idx').bind(m[1]).all<{ idx: number; r2_key: string }>();
  const pages = await Promise.all(pg.results.map((p) => signUrl(env.SESSION_SECRET, `/api/media/${p.r2_key}`, 600)));
  return json({ ...s, pages });
});
route('POST', '/api/submissions/([0-9a-f-]{36})/(approve|reject)', async ({ req, env, d, user, m }) => {
  const u = requireCan(user, 'submission.review');
  const b = (await req.json().catch(() => ({}))) as { reason?: string };
  const s = await env.DB.prepare('SELECT * FROM submissions WHERE id=?').bind(m[1]).first<{ id: string; title: string; creator: string; email: string; lang: Lang; license: string; panel_text: string; status: string }>();
  if (!s) throw new HttpError(404, 'Not found');
  if (s.status !== 'pending') throw new HttpError(409, `Already ${s.status}.`);
  if (m[2] === 'reject') {
    const reason = clean(b.reason, LIMITS.reason, true);
    if (!reason) throw new HttpError(400, 'A reason is required when rejecting.');
    await env.DB.prepare("UPDATE submissions SET status='rejected', reason=?, reviewer_id=?, reviewed_at=? WHERE id=?").bind(reason, u.id, d.now(), s.id).run();
    await audit(env, u.id, 'submission.reject', s.id, { reason });
    await d.send(env, { to: s.email, ...tpl.rejected(s.title, reason) });
    return json({ status: 'rejected' });
  }
  await env.DB.prepare("UPDATE submissions SET status='approved', reviewer_id=?, reviewed_at=? WHERE id=?").bind(u.id, d.now(), s.id).run();
  const pg = await env.DB.prepare('SELECT r2_key, mime FROM submission_pages WHERE submission_id=? ORDER BY idx').bind(s.id).all<{ r2_key: string; mime: string }>();
  const titleId = `${slugify(s.title)}-${s.id.slice(0, 4)}`;
  const urls: string[] = [];
  for (const [i, p] of pg.results.entries()) {
    const src = await bucketOf(env).get(p.r2_key); if (!src) throw new HttpError(500, 'Missing page file');
    const key = `pub/${titleId}/${i + 1}.${p.r2_key.split('.').pop()}`;
    await bucketOf(env).put(key, new Uint8Array(await src.arrayBuffer()), { httpMetadata: { contentType: p.mime } });
    urls.push(`/api/media/${key}`);
  }
  const { story, item } = buildPublication(s, titleId, urls, day());
  const t = d.now();
  await env.DB.batch([
    env.DB.prepare("INSERT INTO titles (id,catalog_json,status,rights,submission_id,created_at,updated_at) VALUES (?,?,'published','creator_submitted',?,?,?)").bind(titleId, JSON.stringify(item), s.id, t, t),
    env.DB.prepare('INSERT INTO stories (title_id,json,updated_at) VALUES (?,?,?)').bind(titleId, JSON.stringify(story), t),
    env.DB.prepare("UPDATE submissions SET status='published', title_id=? WHERE id=?").bind(titleId, s.id),
  ]);
  await audit(env, u.id, 'submission.approve', s.id, { titleId });
  await d.send(env, { to: s.email, ...tpl.approved(s.title, `${env.SITE_ORIGIN}/title/${titleId}`) });
  return json({ status: 'published', titleId });
});

// ---------- takedown ----------
route('POST', '/api/takedown', async ({ req, env, d }) => {
  await rateLimit(env, `takedown:${await ipHash(env, req)}`, 5, 3600, d.now());
  const b = (await req.json().catch(() => ({}))) as Record<string, string>;
  await verifyTurnstile(env, d, b['cf-turnstile-response'] ?? null, clientIp(req));
  const name = clean(b.name, 80), email = clean(b.email, 254).toLowerCase(), reason = clean(b.reason, 3000, true), titleId = clean(b.title, 60) || null;
  if (!name || !isEmail(email) || reason.length < 10) throw new HttpError(400, 'Please give your name, a valid email and a reason.');
  const id = uid();
  await env.DB.prepare('INSERT INTO takedown_requests (id,title_id,name,email,reason,created_at) VALUES (?,?,?,?,?,?)').bind(id, titleId, name, email, reason, d.now()).run();
  await audit(env, null, 'takedown.create', id, { titleId });
  if (env.TAKEDOWN_EMAIL) await d.send(env, { to: env.TAKEDOWN_EMAIL, ...tpl.takedownOwner(id, titleId ?? '(unspecified)', name, email, reason) });
  await d.send(env, { to: email, ...tpl.takedownAck() });
  return json({ id, status: 'open' }, 201);
});
route('GET', '/api/takedowns', async ({ env, user }) => {
  requireCan(user, 'takedown.list');
  return json({ items: (await env.DB.prepare('SELECT id,title_id,name,email,reason,status,created_at FROM takedown_requests ORDER BY created_at DESC LIMIT 100').all()).results });
});
async function unpublish(env: Env, titleId: string, actor: string, why: string) {
  const r = await env.DB.prepare("UPDATE titles SET status='unpublished', updated_at=? WHERE id=? AND status='published'").bind(now(), titleId).run();
  await audit(env, actor, 'title.unpublish', titleId, { why });
  return !!r.meta?.changes;
}
route('POST', '/api/titles/([a-z0-9-]+)/unpublish', async ({ env, user, m }) => {
  const u = requireCan(user, 'title.unpublish');
  if (!(await unpublish(env, m[1], u.id, 'manual'))) throw new HttpError(404, 'No such published D1 title');
  return json({ ok: true });
});
route('POST', '/api/takedowns/([0-9a-f-]{36})/handle', async ({ req, env, user, m }) => {
  const u = requireCan(user, 'takedown.handle');
  const b = (await req.json().catch(() => ({}))) as { unpublish?: boolean; dismiss?: boolean };
  const t = await env.DB.prepare('SELECT id,title_id,status FROM takedown_requests WHERE id=?').bind(m[1]).first<{ id: string; title_id: string | null; status: string }>();
  if (!t) throw new HttpError(404, 'Not found');
  let unpublished = false;
  if (b.unpublish && t.title_id) unpublished = await unpublish(env, t.title_id, u.id, `takedown ${t.id}`);
  await env.DB.prepare('UPDATE takedown_requests SET status=?, handled_by=?, handled_at=? WHERE id=?').bind(b.dismiss ? 'dismissed' : 'actioned', u.id, now(), t.id).run();
  await audit(env, u.id, 'takedown.handle', t.id, { unpublished, dismissed: !!b.dismiss });
  return json({ ok: true, unpublished, staticTitle: !!b.unpublish && !!t.title_id && !unpublished });
});

// ---------- human recordings override generated audio ----------
route('POST', '/api/recordings', async ({ req, env, d, user }) => {
  const u = requireCan(user, 'recording.upload');
  await rateLimit(env, `rec:${u.id}`, 60, 3600, d.now());
  await dailyQuota(env, 'recordings', 500, d.now());
  const f = await req.formData().catch(() => null); if (!f) throw new HttpError(400, 'Expected a form upload.');
  const titleId = clean(f.get('titleId'), 60), lang = clean(f.get('lang'), 5), lineId = clean(f.get('lineId'), 20) || null; const file = f.get('file');
  if (!/^[a-z0-9-]+$/.test(titleId) || !/^[a-z]{2}$/.test(lang) || !file || typeof file === 'string') throw new HttpError(400, 'titleId, lang and file are required.');
  if (file.size > LIMITS.recordingBytes) throw new HttpError(413, 'Recording too large.');
  if (u.role === 'creator') { // creators only for their own published submissions
    const own = await env.DB.prepare("SELECT 1 AS x FROM submissions WHERE title_id=? AND user_id=?").bind(titleId, u.id).first();
    if (!own) throw new HttpError(403, 'You can only record your own titles.');
  }
  const bytes = new Uint8Array(await file.arrayBuffer()); const kind = sniffAudio(bytes);
  if (!kind) throw new HttpError(415, 'Use an MP3, M4A, OGG or WebM recording.');
  const id = uid(); const key = `rec/${titleId}/${id}.${kind.ext}`;
  await bucketOf(env).put(key, bytes, { httpMetadata: { contentType: kind.mime } });
  await env.DB.prepare('DELETE FROM recordings WHERE title_id=? AND lang=? AND line_id IS ?').bind(titleId, lang, lineId).run();
  await env.DB.prepare('INSERT INTO recordings (id,title_id,line_id,lang,r2_key,uploader_id,at) VALUES (?,?,?,?,?,?,?)').bind(id, titleId, lineId, lang, key, u.id, d.now()).run();
  await audit(env, u.id, 'recording.upload', titleId, { lineId, lang });
  return json({ id, url: `/api/media/${key}` }, 201);
});
route('GET', '/api/recordings/([a-z0-9-]+)', async ({ env, m }) => {
  const r = await env.DB.prepare('SELECT line_id, lang, r2_key FROM recordings WHERE title_id=?').bind(m[1]).all<{ line_id: string | null; lang: string; r2_key: string }>();
  return json({ items: r.results.map((x) => ({ lineId: x.line_id, lang: x.lang, url: `/api/media/${x.r2_key}` })) }, 200, { 'cache-control': 'public, max-age=60' });
});
route('GET', '/api/audit', async ({ env, user }) => {
  requireCan(user, 'audit.read');
  return json({ items: (await env.DB.prepare('SELECT * FROM audit_log ORDER BY id DESC LIMIT 200').all()).results });
});
route('POST', '/api/admin/role', async ({ req, env, user }) => {
  const u = requireCan(user, 'role.set');
  const b = (await req.json().catch(() => ({}))) as { email?: string; role?: string };
  if (!isRole(b.role) || !isEmail(clean(b.email, 254))) throw new HttpError(400, 'email and role required');
  await env.DB.prepare('UPDATE profiles SET role=? WHERE email=?').bind(b.role, clean(b.email, 254).toLowerCase()).run();
  await audit(env, u.id, 'role.set', b.email, { role: b.role });
  return json({ ok: true });
});

/** Entry point shared by the Pages Function and the tests. */
export async function handle(req: Request, env: Env, d: Deps = defaultDeps): Promise<Response> {
  const url = new URL(req.url);
  const cors = corsHeaders(req, env);
  try {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: { ...cors, 'access-control-allow-methods': 'GET,POST,DELETE', 'access-control-allow-headers': 'content-type', ...SECURITY_HEADERS } });
    if (!env.SESSION_SECRET || env.SESSION_SECRET.length < 32) throw new HttpError(503, 'Server is not configured.');
    assertSameOrigin(req, env);
    for (const [method, re, h] of routes) {
      const m = re.exec(url.pathname);
      if (m && method === req.method) {
        const res = await h({ req, env, d, url, m, user: await currentUser(req, env) });
        const out = new Response(res.body, res); Object.entries(cors).forEach(([k, v]) => out.headers.set(k, v)); return out;
      }
    }
    throw new HttpError(404, 'Not found');
  } catch (e) {
    if (e instanceof HttpError) return json({ error: e.message, ...e.extra }, e.status, { ...cors, ...(e.extra.retryAfter ? { 'retry-after': String(e.extra.retryAfter) } : {}) });
    console.error(e);
    return json({ error: 'Something went wrong. Please try again later.' }, 500, cors);
  }
}
