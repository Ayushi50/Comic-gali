import { useEffect, useState } from 'react';
import type { Catalog, CatalogItem, Story } from '../types';
import { API_ON, api, apiUrl } from './api';

const base = import.meta.env.BASE_URL.replace(/\/$/, '');
let catalogP: Promise<Catalog> | null = null;
const storyP = new Map<string, Promise<Story>>();

export const loadCatalog = () => (catalogP ??= fetch(`${base}/content/catalog.json`).then((r) => { if (!r.ok) throw new Error('catalog'); return r.json() as Promise<Catalog>; }).then(async (c) => {
  if (!API_ON) return c;
  // API-published (creator) titles are added to the static catalog; the API being down never breaks the site.
  const extra = await api<{ items: CatalogItem[] }>('/api/catalog').then((r) => r.items).catch(() => [] as CatalogItem[]);
  return { ...c, items: [...c.items, ...extra.filter((e) => !c.items.some((i) => i.id === e.id))] };
}));
export const loadStory = (id: string) => {
  if (!storyP.has(id)) storyP.set(id, fetch(`${base}/content/stories/${id}.json`).then((r) => { if (r.ok && (r.headers.get('content-type') ?? '').includes('json')) return r.json(); if (API_ON) return fetch(apiUrl(`/api/stories/${id}`)).then((x) => { if (!x.ok) throw new Error('story'); return x.json(); }); throw new Error('story'); }));
  return storyP.get(id)!;
};
export const storyUrl = (id: string) => `${base}/content/stories/${id}.json`;

export function useCatalog(): { items: CatalogItem[]; ready: boolean; error: boolean } {
  const [c, setC] = useState<Catalog | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => { loadCatalog().then(setC).catch(() => setError(true)); }, []);
  return { items: c?.items ?? [], ready: !!c, error };
}
export function useStory(id: string | undefined) {
  const [s, setS] = useState<Story | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    setS(null); setError(false);
    if (id) loadStory(id).then(setS).catch(() => setError(true));
  }, [id]);
  return { story: s, error };
}

/** Generated-audio manifest (written by `npm run audio`). Missing file = no generated audio. */
export interface AudioMeta { reviewed: Record<string, string>; bytes?: number }
let metaP: Promise<AudioMeta> | null = null;
export const loadAudioMeta = () => (metaP ??= fetch(`${base}/audio/manifest.json`).then((r) => (r.ok && (r.headers.get('content-type') ?? '').includes('json') ? r.json() : { reviewed: {} })).catch(() => ({ reviewed: {} })));
export function useAudioMeta(): AudioMeta { const [m, setM] = useState<AudioMeta>({ reviewed: {} }); useEffect(() => { void loadAudioMeta().then(setM); }, []); return m; }
