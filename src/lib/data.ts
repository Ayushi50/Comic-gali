import { useEffect, useState } from 'react';
import type { Catalog, CatalogItem, Story } from '../types';

const base = import.meta.env.BASE_URL.replace(/\/$/, '');
let catalogP: Promise<Catalog> | null = null;
const storyP = new Map<string, Promise<Story>>();

export const loadCatalog = () => (catalogP ??= fetch(`${base}/content/catalog.json`).then((r) => { if (!r.ok) throw new Error('catalog'); return r.json(); }));
export const loadStory = (id: string) => {
  if (!storyP.has(id)) storyP.set(id, fetch(`${base}/content/stories/${id}.json`).then((r) => { if (!r.ok) throw new Error('story'); return r.json(); }));
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
