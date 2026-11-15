import type { CatalogItem, Story, Lang, Panel, Line } from '../../src/types';
import { slugify } from './validate';

const LICENSE_URLS: Record<string, string> = {
  'CC BY 4.0': 'https://creativecommons.org/licenses/by/4.0/', 'CC BY-SA 4.0': 'https://creativecommons.org/licenses/by-sa/4.0/',
  'CC0': 'https://creativecommons.org/publicdomain/zero/1.0/', 'Permission to host': '',
};
/** "Speaker: text" per line, blank line between panels. Lines without a speaker are narration. */
export function parsePanelText(text: string, lang: Lang): { panels: Panel[]; characters: Story['characters'] } {
  const characters: Story['characters'] = {};
  const blocks = text.split(/\n\s*\n/).map((b) => b.split('\n').map((l) => l.trim()).filter(Boolean)).filter((b) => b.length);
  const panels: Panel[] = blocks.map((rows, pi) => {
    const lines: Line[] = rows.filter((r) => !/^page\s*\d+/i.test(r)).map((r, li) => {
      const m = /^([^:：]{1,30})[:：]\s*(.+)$/.exec(r);
      const id = `p${pi + 1}l${li + 1}`;
      if (m && !/^narrat/i.test(m[1])) {
        const key = slugify(m[1]);
        characters[key] ??= { name: { [lang]: m[1].trim() }, pitch: 1 };
        return { id, kind: 'speech' as const, speaker: key, text: { [lang]: m[2].trim() } };
      }
      return { id, kind: 'narration' as const, text: { [lang]: (m ? m[2] : r).trim() } };
    });
    return { id: `p${pi + 1}`, scene: { bg: 'garden' as const, actors: [] }, alt: { [lang]: `Panel ${pi + 1}` }, lines };
  }).filter((p) => p.lines.length);
  return { panels, characters };
}
export interface SubRow { id: string; title: string; creator: string; lang: Lang; license: string; panel_text: string; }
/** Builds the Story JSON and catalog entry published on approval (rights: creator_submitted). */
export function buildPublication(s: SubRow, titleId: string, pageUrls: string[], today: string): { story: Story; item: CatalogItem } {
  const { panels, characters } = parsePanelText(s.panel_text, s.lang);
  const story: Story = { id: titleId, langs: [s.lang], characters, pageLayouts: [], panels, imagePages: pageUrls };
  const item: CatalogItem = {
    id: titleId, title: { [s.lang]: s.title, en: s.title }, blurb: { [s.lang]: `A story by ${s.creator}.`, en: `A story by ${s.creator}.` },
    series: s.creator, rights: 'creator_submitted', status: 'available', langs: [s.lang], genres: ['indie'], age: 'all',
    palette: ['#0f6e6e', '#e8553d'], coverImage: pageUrls[0],
    credits: [{ author: s.creator, role: 'Creator' }],
    license: { name: s.license, url: LICENSE_URLS[s.license] ?? '' }, verifiedOn: today, shelf: 'indie',
  };
  return { story, item };
}
