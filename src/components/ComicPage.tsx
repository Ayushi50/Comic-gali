import { Scene } from '../art/Scene';
import { PAGE_H, PAGE_W, rectsFor, type Rect } from '../art/layouts';
import { PANELS_PER_PAGE } from '../lib/reader-state';
import type { Lang, Panel, Story } from '../types';

/**
 * Estimates how much of the panel the stacked balloons need (design units), so the artwork can be drawn in the space below them
 * and balloons never cover the characters. Conservative on purpose; capped so the art keeps at least ~38% of the panel.
 */
export function balloonFraction(lines: Panel['lines'], lang: Lang, rect: Rect): number {
  const fs = rect.w < 500 ? 19 : 21;
  const wide = lang === 'en' ? 0.52 : 0.62; // Indic scripts are wider per character
  const usable = rect.w * 0.88 - 30 - 5;
  let h = 28; // panel padding
  for (const l of lines) {
    const text = l.text[lang] ?? l.text.en ?? '';
    if (l.kind === 'sfx') { h += 56; continue; }
    const rows = Math.max(1, Math.ceil((text.length * fs * wide) / usable));
    h += rows * fs * 1.35 + 18 + 5 + (l.kind !== 'narration' && l.speaker ? 14 : 0) + 10;
  }
  return Math.min(0.62, Math.max(0.12, h / rect.h));
}

export function PanelView({ story, panel, lang, rect, activeLine, dim }: { story: Story; panel: Panel; lang: Lang; rect: Rect; activeLine?: string | null; dim?: boolean }) {
  const order: string[] = [];
  const alt = panel.alt[lang] ?? panel.alt.en;
  const frac = balloonFraction(panel.lines, lang, rect);
  return (
    <div className={`panel${rect.w < 500 ? ' small' : ''}${dim ? ' dim' : ''}`} style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h }} role="group" aria-label={alt}>
      <div className="art" style={{ height: `${(1 - frac) * 100}%` }}><Scene spec={panel.scene} aspect={rect.w / (rect.h * (1 - frac))} /></div>
      <div className="balloons" lang={lang}>
        {panel.lines.map((l) => {
          if (l.speaker && !order.includes(l.speaker)) order.push(l.speaker);
          const side = l.speaker && order.indexOf(l.speaker) % 2 === 1 ? 'b' : 'a';
          const cls = l.kind === 'narration' ? 'nar' : l.kind === 'sfx' ? 'sfx' : l.kind === 'thought' ? 'thought' : `speech ${side}`;
          const who = l.kind !== 'narration' && l.kind !== 'sfx' && l.speaker ? story.characters[l.speaker]?.name[lang] ?? story.characters[l.speaker]?.name.en : null;
          return (
            <div key={l.id} className={`bl ${cls}${l.id === activeLine ? ' active' : ''}`} data-line={l.id}>
              {who && <span className="who">{who}</span>}
              {l.text[lang] ?? l.text.en}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ComicPage({ story, lang, page, rtl, activeLine, activePanel, dimOthers, peel }: {
  story: Story; lang: Lang; page: number; rtl: boolean; activeLine?: string | null; activePanel: number; dimOthers: boolean; peel?: boolean;
}) {
  const rects = rectsFor(story.pageLayouts[page] ?? 'A', rtl);
  return (
    <div className={`sheet${peel ? ' peel' : ''}`} style={{ width: PAGE_W, height: PAGE_H }}>
      {rects.map((r, i) => {
        const idx = page * PANELS_PER_PAGE + i;
        const p = story.panels[idx];
        return p ? <PanelView key={p.id} story={story} panel={p} lang={lang} rect={r} activeLine={idx === activePanel ? activeLine : null} dim={dimOthers && idx !== activePanel} /> : null;
      })}
    </div>
  );
}
