import { storyUrl } from './data';
import { load, save } from './storage';

const CACHE = 'cg-packs-v1';
export const offlineSupported = () => typeof caches !== 'undefined';
export const packIds = () => load<string[]>('cg:packs', []);
export const hasPack = (id: string) => packIds().includes(id);
export const packSize = (id: string) => load<Record<string, number>>('cg:packsize', {})[id] ?? 0;
export const formatBytes = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1e3))} KB`);

/** Every audio/image URL a story references: per-line audio, whole-story recordings and uploaded page images. */
export function assetUrls(story: { panels?: { lines: { audio?: Record<string, string> }[] }[]; audioWhole?: Record<string, { url: string }>; imagePages?: string[] } | null): string[] {
  const out = new Set<string>();
  for (const p of story?.panels ?? []) for (const l of p.lines) for (const u of Object.values(l.audio ?? {})) out.add(u);
  for (const w of Object.values(story?.audioWhole ?? {})) out.add(w.url);
  for (const u of story?.imagePages ?? []) out.add(u);
  return [...out];
}

/** An offline pack = the story JSON plus every audio file and page image it references. Returns the size in bytes. */
export async function savePack(id: string): Promise<number> {
  const c = await caches.open(CACHE);
  const url = storyUrl(id);
  await c.add(url);
  const res = await c.match(url);
  const story = res ? await res.clone().json() : null;
  let bytes = res ? (await res.clone().blob()).size : 0;
  for (const u of assetUrls(story)) {
    try { await c.add(u); const r = await c.match(u); if (r) bytes += (await r.clone().blob()).size; } catch { /* a missing file should not block the pack */ }
  }
  save('cg:packs', [...new Set([...packIds(), id])]);
  save('cg:packsize', { ...load<Record<string, number>>('cg:packsize', {}), [id]: bytes });
  return bytes;
}
export async function removePack(id: string): Promise<void> {
  const c = await caches.open(CACHE);
  const res = await c.match(storyUrl(id));
  const story = res ? await res.clone().json().catch(() => null) : null;
  for (const u of assetUrls(story)) await c.delete(u);
  await c.delete(storyUrl(id));
  save('cg:packs', packIds().filter((x) => x !== id));
  const sizes = load<Record<string, number>>('cg:packsize', {}); delete sizes[id]; save('cg:packsize', sizes);
}
