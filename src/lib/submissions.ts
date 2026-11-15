/** Creator submissions: stored in IndexedDB on this device (prototype). Optionally POSTed to VITE_SUBMIT_ENDPOINT. */
export interface Submission {
  id: string; title: string; creator: string; email: string; lang: string; license: string;
  panelText: string; pages: string[]; // data URLs
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
  const ep = import.meta.env.VITE_SUBMIT_ENDPOINT as string | undefined;
  if (ep) { try { await fetch(ep, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(s) }); } catch { /* queued locally */ } }
}
export async function loadSubmissions(): Promise<Submission[]> {
  const db = await open(); const all = await wrap(db.transaction('s').objectStore('s').getAll() as IDBRequest<Submission[]>);
  return all.sort((a, b) => b.at - a.at);
}
export async function setStatus(id: string, status: Submission['status']) {
  const db = await open(); const st = db.transaction('s', 'readwrite').objectStore('s');
  const cur = await wrap(st.get(id) as IDBRequest<Submission | undefined>); if (cur) await wrap(st.put({ ...cur, status }));
}
export const fileToDataUrl = (f: File) => new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = () => rej(r.error); r.readAsDataURL(f); });
