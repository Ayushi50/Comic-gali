import type { CSSProperties } from 'react';

/** Abstract covers drawn in CSS, as in the supplied design. Real art can replace these later. */
const VARIANTS = [
  { bg: 'c2', on: 'on2' }, { bg: 'c1', on: 'on1' }, { bg: 'c4', on: 'on4' }, { bg: 'c2', on: 'on2' }, { bg: 'c3', on: 'on3' },
] as const;

export function hashId(id: string) {
  return [...id].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
}

interface Props {
  id: string;
  title: string;
  tag?: string; // top-right label, e.g. KAHANI
  soon?: string; // label text when the title is not yet licensed
  variant?: number;
  className?: string;
}

export function Cover({ id, title, tag = 'KAHANI', soon, variant, className }: Props) {
  const v = variant ?? hashId(id) % VARIANTS.length;
  const { bg, on } = VARIANTS[v];
  const style = { '--cb': `var(--${bg})`, '--on': `var(--${on})` } as CSSProperties;
  return (
    <div className={`cv${soon ? ' soon' : ''} ${className ?? ''}`} style={style}>
      {v === 0 && <div className="sh" aria-hidden="true" style={{ left: '50%', top: '42%', width: '76%', aspectRatio: '1', transform: 'translate(-50%,-50%)', borderRadius: '50%', backgroundImage: 'radial-gradient(circle,currentColor 2.4px,transparent 3px)', backgroundSize: '12px 12px' }} />}
      {v === 1 && <div className="sh" aria-hidden="true" style={{ left: '50%', top: '42%', width: '84%', aspectRatio: '1', transform: 'translate(-50%,-50%)', borderRadius: '50%', background: 'repeating-conic-gradient(currentColor 0 4deg,transparent 4deg 14deg)', WebkitMaskImage: 'radial-gradient(circle,transparent 22%,#000 23%)', maskImage: 'radial-gradient(circle,transparent 22%,#000 23%)' }} />}
      {v === 2 && <>
        <div className="sh" aria-hidden="true" style={{ left: '14%', top: '20%', width: '46%', aspectRatio: '1', borderRadius: '50%', background: 'var(--ink)' }} />
        <div className="sh" aria-hidden="true" style={{ left: '40%', top: '20%', width: '46%', aspectRatio: '1', borderRadius: '50%', background: 'var(--paper)' }} />
        <div className="sh" aria-hidden="true" style={{ left: '27%', top: '36%', width: '46%', aspectRatio: '1', borderRadius: '50%', background: 'var(--c1)' }} />
      </>}
      {v === 3 && <>
        <div className="sh" aria-hidden="true" style={{ left: '21%', top: '18%', width: '58%', height: '50%', borderRadius: '999px 999px 0 0', background: 'currentColor' }} />
        <div className="sh" aria-hidden="true" style={{ left: '33%', top: '30%', width: '34%', height: '38%', borderRadius: '999px 999px 0 0', background: 'var(--cb)' }} />
      </>}
      {v === 4 && <>
        <div className="sh" aria-hidden="true" style={{ left: '22%', top: '20%', width: '50%', aspectRatio: '1', borderRadius: '50%', background: 'currentColor' }} />
        <div className="sh" aria-hidden="true" style={{ left: '36%', top: '15%', width: '46%', aspectRatio: '1', borderRadius: '50%', background: 'var(--cb)' }} />
        <div className="sh" aria-hidden="true" style={{ right: '18%', top: '52%', width: '4%', aspectRatio: '1', borderRadius: '50%', background: 'currentColor' }} />
      </>}
      <div className="cl"><span>COMIC GALI</span><span>{tag}</span></div>
      {soon && <div className="lock" aria-hidden="true">{soon}</div>}
      <div className="ct">{title}</div>
    </div>
  );
}
