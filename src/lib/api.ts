import { useEffect, useState } from 'react';
import { getFavs, load, recentPositions, save } from './storage';

/** The backend is optional. With VITE_API unset the whole site runs static, as before. */
export const API_ON = import.meta.env.VITE_API === '1';
const base = import.meta.env.BASE_URL.replace(/\/$/, '');
export const apiUrl = (p: string) => `${base}${p}`;

export class ApiError extends Error { constructor(public status: number, message: string) { super(message); } }
export async function api<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && typeof init.body === 'string') headers.set('content-type', 'application/json');
  const r = await fetch(apiUrl(path), { credentials: 'same-origin', ...init, headers });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new ApiError(r.status, (j as { error?: string }).error ?? 'Request failed');
  return j as T;
}

export interface Config { takedownEmail: string | null; turnstileSiteKey: string | null; google: boolean; magicLink: boolean }
export interface Me { id: string; email: string; name: string | null; role: 'reader' | 'creator' | 'moderator' | 'admin' }
let cfgP: Promise<Config | null> | null = null;
export const loadConfig = () => (cfgP ??= API_ON ? api<Config>('/api/config').catch(() => null) : Promise.resolve(null));
export function useConfig() { const [c, setC] = useState<Config | null>(null); useEffect(() => { void loadConfig().then(setC); }, []); return c; }

export const getMe = () => (API_ON ? api<{ user: Me | null }>('/api/auth/me').then((r) => r.user).catch(() => null) : Promise.resolve(null));
/** First name for display: first word of the name, or the part of the email before the @. */
export const firstName = (u: { name: string | null; email: string }) => u.name?.trim().split(/\s+/)[0] || u.email.split('@')[0];
export function useMe() {
  const [me, setMe] = useState<Me | null>(null); const [ready, setReady] = useState(!API_ON);
  useEffect(() => { let on = true; void getMe().then((u) => { if (on) { setMe(u); setReady(true); } }); return () => { on = false; }; }, []);
  return { me, ready };
}

/** On sign-in: merge local favourites + positions into the account, then adopt the merged result locally. */
export async function syncWithAccount() {
  if (!API_ON) return;
  const positions = Object.fromEntries(recentPositions().map((p) => [p.id, p.pos]));
  try {
    const merged = await api<{ favs: string[]; positions: Record<string, { index: number; lang: string; mode: string; dir: string; at: number }> }>('/api/me/sync', { method: 'POST', body: JSON.stringify({ favs: getFavs(), positions }) });
    save('cg:favs', merged.favs);
    for (const [id, p] of Object.entries(merged.positions)) save(`cg:pos:${id}`, p);
  } catch { /* offline: try again next load */ }
}
/** Push a single change when signed in (best effort). */
export function pushPosition(id: string, p: { index: number; lang: string; mode: string; dir: string }) {
  if (!API_ON || !load<string | null>('cg:user', null)) return;
  void api('/api/me/sync', { method: 'POST', body: JSON.stringify({ favs: [], positions: { [id]: { ...p, at: Date.now() } } }) }).catch(() => undefined);
}
export function pushFavs() { if (API_ON && load<string | null>('cg:user', null)) void api('/api/me/sync', { method: 'POST', body: JSON.stringify({ favs: getFavs(), positions: {} }) }).catch(() => undefined); }
export const unfav = (id: string) => { if (API_ON) void api(`/api/me/favourites/${id}`, { method: 'DELETE' }).catch(() => undefined); };

// Keep the account in step with local changes (only when signed in and the API is on).
if (API_ON && typeof window !== 'undefined') {
  window.addEventListener('cg:favs', (e) => { const d = (e as CustomEvent<{ id: string; on: boolean }>).detail; d.on ? pushFavs() : unfav(d.id); });
  let t: ReturnType<typeof setTimeout> | undefined;
  window.addEventListener('cg:pos', (e) => { const d = (e as CustomEvent<{ id: string; p: { index: number; lang: string; mode: string; dir: string } }>).detail; clearTimeout(t); t = setTimeout(() => pushPosition(d.id, d.p), 3000); });
}

/** Sign out everywhere on this device: server session, saved name and (with the API on) the account's cached favourites and positions, so the next person starts clean. */
export async function signOut() {
  if (API_ON) {
    await api('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
    try {
      for (const k of Object.keys(localStorage)) if (k === 'cg:favs' || k.startsWith('cg:pos:')) localStorage.removeItem(k);
    } catch { /* ignore */ }
  }
  save('cg:user', null);
  window.dispatchEvent(new Event('cg:signout'));
}
