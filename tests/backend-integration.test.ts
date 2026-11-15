import { beforeEach, describe, expect, it } from 'vitest';
import { handle, type Deps } from '../functions/_lib/app';
import type { Env } from '../functions/_lib/db';
import { MemoryBucket, makeD1 } from './helpers/d1';

const ORIGIN = 'https://cg.test';
const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4, 5]);
let env: Env; let mails: { to: string; subject: string; text: string }[]; let d: Deps; let ipn = 0;

beforeEach(() => {
  env = { DB: makeD1(), BUCKET: new MemoryBucket() as never, SITE_ORIGIN: ORIGIN, SESSION_SECRET: 'k'.repeat(40), ADMIN_EMAIL: 'boss@cg.test', TAKEDOWN_EMAIL: 'owner@cg.test' };
  mails = []; ipn++;
  d = { send: async (_e, m) => { mails.push(m); return true; }, fetch: async () => new Response('{}'), now: () => Date.now() };
});
const call = (path: string, init: RequestInit & { cookie?: string; ip?: string } = {}) => {
  const h = new Headers(init.headers); h.set('origin', ORIGIN); h.set('cf-connecting-ip', init.ip ?? `1.1.1.${ipn}`);
  if (init.cookie) h.set('cookie', init.cookie);
  return handle(new Request(ORIGIN + path, { ...init, headers: h }), env, d);
};
const post = (path: string, body: unknown, cookie?: string) => call(path, { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' }, cookie });

async function login(email: string): Promise<string> {
  await post('/api/auth/magic', { email });
  const link = mails.at(-1)!.text.match(/https?:\/\/\S+/)![0];
  const r = await call(new URL(link).pathname + new URL(link).search);
  expect(r.status).toBe(302);
  return r.headers.get('set-cookie')!.split(';')[0];
}
function submitForm(over: Record<string, string> = {}) {
  const f = new FormData();
  Object.entries({ title: 'Kite Day', creator: 'Riya', email: 'riya@x.com', lang: 'en', license: 'CC BY 4.0', consent: 'true', panelText: 'Narrator: Evening.\nRiya: Kites!', ...over }).forEach(([k, v]) => f.set(k, v));
  f.append('pages', new File([png], 'p1.png', { type: 'image/png' }));
  return f;
}

describe('auth', () => {
  it('magic link signs in once, creates a reader, and admin email becomes admin', async () => {
    const c = await login('someone@x.com');
    expect((await (await call('/api/auth/me', { cookie: c })).json()).user.role).toBe('reader');
    const link = mails.at(-1)!.text.match(/https?:\/\/\S+/)![0];
    expect((await call(new URL(link).pathname + new URL(link).search)).headers.get('location')).toContain('error=link'); // replay fails
    const a = await login('boss@cg.test');
    expect((await (await call('/api/auth/me', { cookie: a })).json()).user.role).toBe('admin');
  });
  it('cookie is httpOnly, Secure, SameSite and a forged cookie is rejected', async () => {
    await post('/api/auth/magic', { email: 'a@x.com' });
    const link = mails.at(-1)!.text.match(/https?:\/\/\S+/)![0];
    const sc = (await call(new URL(link).pathname + new URL(link).search)).headers.get('set-cookie')!;
    expect(sc).toMatch(/HttpOnly/); expect(sc).toMatch(/Secure/); expect(sc).toMatch(/SameSite=Lax/);
    expect((await (await call('/api/auth/me', { cookie: 'cg_session=forged.sig' })).json()).user).toBeNull();
  });
  it('blocks cross-origin writes', async () => {
    const r = await handle(new Request(ORIGIN + '/api/auth/logout', { method: 'POST', headers: { origin: 'https://evil.test' } }), env, d);
    expect(r.status).toBe(403);
  });
});

describe('submit → approve → publish', () => {
  it('runs the full flow with emails, consent, audit log and public listing', async () => {
    const r = await call('/api/submissions', { method: 'POST', body: submitForm() });
    expect(r.status).toBe(201);
    const { id } = await r.json();
    expect(mails.at(-1)!.subject).toMatch(/received/);
    const consent = await env.DB.prepare('SELECT ip_hash, text FROM consents WHERE submission_id=?').bind(id).first<{ ip_hash: string }>();
    expect(consent!.ip_hash).toMatch(/^[0-9a-f]{64}$/); expect(consent!.ip_hash).not.toContain('1.1.1');

    // not visible publicly while pending
    expect((await (await call('/api/catalog')).json()).items).toHaveLength(0);
    // anon / reader cannot moderate
    expect((await call('/api/submissions')).status).toBe(401);
    const reader = await login('reader@x.com');
    expect((await call('/api/submissions', { cookie: reader })).status).toBe(403);
    expect((await post(`/api/submissions/${id}/approve`, {}, reader)).status).toBe(403);

    const mod = await login('boss@cg.test');
    const detail = await (await call(`/api/submissions/${id}`, { cookie: mod })).json();
    expect(detail.pages[0]).toMatch(/exp=\d+&sig=/);
    expect((await call(detail.pages[0])).status).toBe(200);                      // signed URL works
    expect((await call(detail.pages[0].split('?')[0])).status).toBe(403);       // unsigned does not
    const ap = await post(`/api/submissions/${id}/approve`, {}, mod);
    expect(ap.status).toBe(200);
    const { titleId } = await ap.json();
    expect(mails.at(-1)!.subject).toMatch(/live/);
    expect((await post(`/api/submissions/${id}/approve`, {}, mod)).status).toBe(409);

    const cat = (await (await call('/api/catalog')).json()).items;
    expect(cat[0]).toMatchObject({ id: titleId, rights: 'creator_submitted', license: { name: 'CC BY 4.0' } });
    const story = await (await call(`/api/stories/${titleId}`)).json();
    expect(story.panels[0].lines).toHaveLength(2); expect(story.imagePages).toHaveLength(1);
    expect((await call(story.imagePages[0])).status).toBe(200);                  // published page is public
    const log = await (await call('/api/audit', { cookie: mod })).json();
    expect(log.items.map((x: { action: string }) => x.action)).toEqual(expect.arrayContaining(['submission.create', 'submission.approve']));
  });
  it('rejects with a required reason and emails it', async () => {
    const { id } = await (await call('/api/submissions', { method: 'POST', body: submitForm() })).json();
    const mod = await login('boss@cg.test');
    expect((await post(`/api/submissions/${id}/reject`, {}, mod)).status).toBe(400);
    expect((await post(`/api/submissions/${id}/reject`, { reason: 'Unclear rights' }, mod)).status).toBe(200);
    expect(mails.at(-1)!.text).toContain('Unclear rights');
    expect((await (await call('/api/catalog')).json()).items).toHaveLength(0);
  });
  it('validates uploads server-side', async () => {
    const f = submitForm(); f.delete('pages'); f.append('pages', new File([new TextEncoder().encode('<svg/>')], 'x.png', { type: 'image/png' }));
    expect((await call('/api/submissions', { method: 'POST', body: f })).status).toBe(415);
    expect((await call('/api/submissions', { method: 'POST', body: submitForm({ consent: 'false' }) })).status).toBe(400);
  });
  it('rate limits per IP and returns a friendly try-later at the daily cap', async () => {
    for (let i = 0; i < 5; i++) expect((await call('/api/submissions', { method: 'POST', body: submitForm(), ip: '9.9.9.9' })).status).toBe(201);
    expect((await call('/api/submissions', { method: 'POST', body: submitForm(), ip: '9.9.9.9' })).status).toBe(429);
    env.DAILY_SUBMISSION_CAP = '1';
    const r = await call('/api/submissions', { method: 'POST', body: submitForm(), ip: '8.8.8.8' });
    expect(r.status).toBe(503); expect((await r.json()).error).toMatch(/try again/i);
  });
  it('requires Turnstile when configured', async () => {
    env.TURNSTILE_SECRET = 'x'; 
    expect((await call('/api/submissions', { method: 'POST', body: submitForm() })).status).toBe(400);
    d.fetch = async () => new Response(JSON.stringify({ success: true }));
    const f = submitForm(); f.set('cf-turnstile-response', 'tok');
    expect((await call('/api/submissions', { method: 'POST', body: f })).status).toBe(201);
  });
});

describe('takedown', () => {
  it('stores, emails the owner, and a moderator can unpublish in one action', async () => {
    const { id } = await (await call('/api/submissions', { method: 'POST', body: submitForm() })).json();
    const mod = await login('boss@cg.test');
    const { titleId } = await (await post(`/api/submissions/${id}/approve`, {}, mod)).json();
    const r = await post('/api/takedown', { name: 'Owner', email: 'o@x.com', reason: 'This is my artwork, please remove.', title: titleId });
    expect(r.status).toBe(201); const t = await r.json();
    expect(mails.some((m) => m.to === 'owner@cg.test')).toBe(true);
    expect((await call('/api/takedowns')).status).toBe(401);
    const h = await (await post(`/api/takedowns/${t.id}/handle`, { unpublish: true }, mod)).json();
    expect(h.unpublished).toBe(true);
    expect((await (await call('/api/catalog')).json()).items).toHaveLength(0);
    expect((await call(`/api/stories/${titleId}`)).status).toBe(404);
  });
});

describe('sync', () => {
  it('merges local favourites and keeps the newest reading position', async () => {
    const c = await login('s@x.com');
    await post('/api/me/sync', { favs: ['a'], positions: { a: { index: 5, lang: 'en', mode: 'flip', dir: 'ltr', at: 200 } } }, c);
    const r = await (await post('/api/me/sync', { favs: ['b'], positions: { a: { index: 1, lang: 'en', mode: 'flip', dir: 'ltr', at: 100 } } }, c)).json();
    expect(r.favs.sort()).toEqual(['a', 'b']); expect(r.positions.a.index).toBe(5);
    expect((await call('/api/me/sync')).status).toBe(401);
  });
});

describe('recordings', () => {
  it('lets a moderator upload a human recording and serves it', async () => {
    const mod = await login('boss@cg.test');
    const f = new FormData(); f.set('titleId', 'monkey-crocodile'); f.set('lang', 'hi'); f.set('lineId', 'p1l1');
    f.set('file', new File([new TextEncoder().encode('OggS\0\0\0\0xx')], 'r.ogg'));
    const r = await call('/api/recordings', { method: 'POST', body: f, cookie: mod }); expect(r.status).toBe(201);
    const list = await (await call('/api/recordings/monkey-crocodile')).json();
    expect(list.items[0]).toMatchObject({ lineId: 'p1l1', lang: 'hi' });
    expect((await call(list.items[0].url)).status).toBe(200);
    const anon = await call('/api/recordings', { method: 'POST', body: f });
    expect(anon.status).toBe(401);
  });
});
