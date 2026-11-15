/**
 * Creator submissions.
 * - API on (VITE_API=1): POSTed to /api/submissions (stored in R2/D1); see submitToApi.
 * - API off: kept on this device in IndexedDB as File blobs (not data URLs), with a local-only moderation view.
 */
import { api, apiUrl } from './api';

export interface Submission {
  id: string; title: string; creator: string; email: string; lang: string; license: string;
  panelText: string; files: Blob[]; pages?: string[]; // `pages` = legacy data URLs from older versions
  status: 'pending' | 'approved' | 'rejected'; at: number;
}
const DB = 'cg-submissions';
function open(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore('s', { keyPath: 'id' });
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
}
const wrap = <T,>(req: IDBRequest<T>) => new Promise<T>((res, rej) => { req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error); });
export async function addSubmission(s: Submission) {
  const db = await open(); await wrap(db.transaction('s', 'readwrite').objectStore('s').put(s));
}
export async function loadSubmissions(): Promise<Submission[]> {
  const db = await open(); const all = await wrap(db.transaction('s').objectStore('s').getAll() as IDBRequest<Submission[]>);
  return all.sort((a, b) => b.at - a.at);
}
export async function setStatus(id: string, status: Submission['status']) {
  const db = await open(); const st = db.transaction('s', 'readwrite').objectStore('s');
  const cur = await wrap(st.get(id) as IDBRequest<Submission | undefined>); if (cur) await wrap(st.put({ ...cur, status }));
}
/** Object URLs for previews (revoke them when done). */
export const previewUrls = (s: Submission) => [...(s.files ?? []).map((f) => URL.createObjectURL(f)), ...(s.pages ?? [])];

export async function submitToApi(fields: Record<string, string>, files: File[], turnstile: string) {
  const f = new FormData();
  Object.entries(fields).forEach(([k, v]) => f.set(k, v));
  files.forEach((x) => f.append('pages', x));
  if (turnstile) f.set('cf-turnstile-response', turnstile);
  const r = await fetch(apiUrl('/api/submissions'), { method: 'POST', body: f, credentials: 'same-origin' });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((j as { error?: string }).error ?? 'Could not send. Please try again later.');
  return j as { id: string };
}
export { api };
