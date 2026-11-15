/** Safe localStorage wrappers (storage can throw in private windows). */
export function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw == null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}
export function save(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

export interface Position {
  index: number;
  lang: string;
  mode: string;
  dir: string;
  at: number;
}
export const posKey = (id: string) => `cg:pos:${id}`;
export const getPosition = (id: string) => load<Position | null>(posKey(id), null);
export const setPosition = (id: string, p: Omit<Position, 'at'>) => {
  save(posKey(id), { ...p, at: Date.now() });
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('cg:pos', { detail: { id, p } }));
};
export function recentPositions(): { id: string; pos: Position }[] {
  const out: { id: string; pos: Position }[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith('cg:pos:')) {
        const pos = load<Position | null>(k, null);
        if (pos) out.push({ id: k.slice(7), pos });
      }
    }
  } catch {
    /* ignore */
  }
  return out.sort((a, b) => b.pos.at - a.pos.at);
}
export const getFavs = () => load<string[]>('cg:favs', []);
export const toggleFav = (id: string): string[] => {
  const f = getFavs();
  const next = f.includes(id) ? f.filter((x) => x !== id) : [...f, id];
  save('cg:favs', next);
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('cg:favs', { detail: { id, on: next.includes(id) } }));
  return next;
};
