import { storyUrl } from './data';
import { load, save } from './storage';

const CACHE = 'cg-packs-v1';
export const offlineSupported = () => typeof caches !== 'undefined';
export const packIds = () => load<string[]>('cg:packs', []);
export const hasPack = (id: string) => packIds().includes(id);

/** An offline pack = the story JSON plus any pre-recorded audio files it references. */
export async function savePack(id: string): Promise<void> {
  const c = await caches.open(CACHE);
  const url = storyUrl(id);
  await c.add(url);
  const res = await c.match(url);
  const story = res ? await res.clone().json() : null;
  const audio = new Set<string>();
  for (const p of story?.panels ?? []) for (const l of p.lines) for (const u of Object.values(l.audio ?? {})) audio.add(u as string);
  await Promise.all([...audio].map((u) => c.add(u).catch(() => undefined)));
  save('cg:packs', [...new Set([...packIds(), id])]);
}
export async function removePack(id: string): Promise<void> {
  const c = await caches.open(CACHE);
  await c.delete(storyUrl(id));
  save('cg:packs', packIds().filter((x) => x !== id));
}
