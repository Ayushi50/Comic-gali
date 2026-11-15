import { useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { PAGE_H, PAGE_W, rectsFor } from '../art/layouts';
import { ComicPage, PanelView } from '../components/ComicPage';
import { Driving } from '../components/Driving';
import { Left, Minus, Pause, Play, Plus, Right, Skip, SkipBack } from '../components/Icons';
import { useCatalog, useStory } from '../lib/data';
import { LANG_NAMES, useI18n } from '../lib/i18n';
import { fitTransform, initReader, keyToAction, pageCount, pageOf, PANELS_PER_PAGE, readerReducer } from '../lib/reader-state';
import { dhak, playRustle } from '../lib/sound';
import { getPosition, setPosition } from '../lib/storage';
import { useListen } from '../lib/useListen';
import type { Lang, ReadMode, Story } from '../types';

function useSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = ref.current; if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el); setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);
  return [ref, size] as const;
}

/** Scroll-mode panel: renders a panel at its design size and scales it to the column width. */
function ScrollPanel({ story, idx, lang, activeLine, onSeen, registerEl }: { story: Story; idx: number; lang: Lang; activeLine: string | null; onSeen: (i: number) => void; registerEl: (i: number, el: HTMLElement | null) => void }) {
  const [ref, size] = useSize<HTMLDivElement>();
  const page = pageOf(idx);
  const r = rectsFor(story.pageLayouts[page] ?? 'A', false)[idx % PANELS_PER_PAGE];
  const s = size.w ? size.w / r.w : 1;
  useEffect(() => {
    const el = ref.current; if (!el) return;
    registerEl(idx, el);
    const io = new IntersectionObserver((es) => { if (es[0].isIntersecting && es[0].intersectionRatio > 0.55) onSeen(idx); }, { threshold: [0.55] });
    io.observe(el);
    return () => { io.disconnect(); registerEl(idx, null); };
  }, [idx, onSeen, registerEl, ref]);
  return (
    <div ref={ref} className="sc-panel" style={{ height: r.h * s }}>
      <div className="inner" style={{ width: r.w, height: r.h, transform: `scale(${s})` }}>
        <PanelView story={story} panel={story.panels[idx]} lang={lang} rect={{ x: 0, y: 0, w: r.w, h: r.h }} activeLine={activeLine} />
      </div>
    </div>
  );
}

/** Creator-submitted comics are uploaded page images: a simple page-by-page viewer with the same listen bar. */
function ImageReader({ id, story, title }: { id: string; story: Story; title: string }) {
  const { t } = useI18n();
  const lang = story.langs[0];
  const L = useListen(story, lang, true);
  const [n, setN] = useState(() => Math.min(getPosition(id)?.index ?? 0, story.imagePages!.length - 1));
  const pages = story.imagePages!;
  useEffect(() => { setPosition(id, { index: n, lang, mode: 'flip', dir: 'ltr' }); }, [id, n, lang]);
  const playing = L.state.status === 'playing';
  return (
    <div className="rd">
      <div className="rd-top"><Link to={`/title/${id}`} className="rnd sm" aria-label={t('rd.back')}><Left /></Link><div className="ttl serif" lang={lang}>{title}</div></div>
      <div className="rd-main">
        <button type="button" className="rd-btn dhak" onClick={() => setN((x) => Math.max(0, x - 1))} aria-label={t('rd.prev')}><Left /></button>
        <div className="stage" style={{ display: 'grid', placeItems: 'center', overflow: 'auto' }}><img src={pages[n]} alt={`${title} — ${t('rd.page')} ${n + 1}/${pages.length}`} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} /></div>
        <button type="button" className="rd-btn dhak" onClick={() => setN((x) => Math.min(pages.length - 1, x + 1))} aria-label={t('rd.next')}><Right /></button>
      </div>
      {story.panels.length > 0 && <div className="lbar" role="group" aria-label="Listen">
        <button type="button" className="pri sm dhak" onClick={L.toggle} aria-label={playing ? t('ls.pause') : t('ls.play')}>{playing ? <Pause s={18} /> : <Play s={18} />}{playing ? t('ls.pause') : t('ls.play')}</button>
        <div className="grow"><div className="tiny">{t('rd.page')} {n + 1}/{pages.length}</div></div>
      </div>}
    </div>
  );
}

export default function Reader() {
  const { id = '' } = useParams();
  const [sp] = useSearchParams();
  const { t, pick, ui } = useI18n();
  const { items } = useCatalog();
  const { story, error } = useStory(id);
  if (error) return <div className="wrap"><div className="empty">{t('nf')} <Link to="/library" className="lnk ul">{t('nav.library')}</Link></div></div>;
  if (!story) return <div className="empty">{t('loading')}</div>;
  if (story.imagePages?.length) return <ImageReader key={id} id={id} story={story} title={pick(items.find((i) => i.id === id)?.title) || id} />;
  return <ReaderInner key={id} id={id} story={story} title={pick(items.find((i) => i.id === id)?.title) || id} initialLang={sp.get('lang')} ui={ui} />;
}

function ReaderInner({ id, story, title, initialLang, ui }: { id: string; story: Story; title: string; initialLang: string | null; ui: string }) {
  const { t } = useI18n();
  const saved = getPosition(id);
  const total = story.panels.length;
  const [lang, setLang] = useState<Lang>(() => {
    const want = (initialLang ?? saved?.lang ?? (ui !== 'en' && story.langs.includes('hi') ? 'hi' : 'en')) as Lang;
    return story.langs.includes(want) ? want : story.langs[0];
  });
  const [s, dispatch] = useReducer(readerReducer, undefined, () =>
    initReader(total, { index: saved?.index ?? 0, mode: (saved?.mode as ReadMode) ?? (window.innerWidth < 760 ? 'panel' : 'flip'), dir: (saved?.dir as 'ltr' | 'rtl') ?? 'ltr' }));
  const L = useListen(story, lang, true);
  const [drive, setDrive] = useState(false);
  const rtl = s.dir === 'rtl';
  const page = pageOf(s.index);
  const pages = pageCount(total);

  // remember position
  useEffect(() => { setPosition(id, { index: s.index, lang, mode: s.mode, dir: s.dir }); }, [id, s.index, s.mode, s.dir, lang]);
  // page-turn rustle
  const lastPage = useRef(page);
  useEffect(() => { if (page !== lastPage.current) { playRustle(); lastPage.current = page; } }, [page]);

  // audio <-> reader sync
  useEffect(() => { if (L.state.status !== 'idle' && L.state.panel !== s.index) dispatch({ type: 'goto', index: L.state.panel }); /* eslint-disable-next-line */ }, [L.state.panel]);
  useEffect(() => { if (L.state.panel !== s.index) L.seekPanel(s.index); /* eslint-disable-next-line */ }, [s.index, lang]);

  // keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || e.metaKey || e.ctrlKey || drive) return;
      if (e.key === 'l' || e.key === 'p') { L.toggle(); return; }
      if (e.key === 'm') { dispatch({ type: 'mode', mode: s.mode === 'flip' ? 'panel' : s.mode === 'panel' ? 'scroll' : 'flip' }); return; }
      const a = keyToAction(e.key, s.dir);
      if (a) { e.preventDefault(); dispatch(a); dhak(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [s.dir, s.mode, drive, L]);

  // stage geometry
  const [stageRef, size] = useSize<HTMLDivElement>();
  const rects = rectsFor(story.pageLayouts[page] ?? 'A', rtl);
  const focus = s.mode === 'panel' ? rects[s.index % PANELS_PER_PAGE] : { x: 0, y: 0, w: PAGE_W, h: PAGE_H };
  const base = fitTransform(size.w || 1, size.h || 1, focus, s.mode === 'panel' ? 0.96 : 0.98);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [gesture, setGesture] = useState(false);
  useEffect(() => { if (s.zoom === 1) setPan({ x: 0, y: 0 }); }, [s.zoom, s.index]);
  const cx = size.w / 2, cy = size.h / 2;
  const tx = cx + (base.tx - cx) * s.zoom + pan.x;
  const ty = cy + (base.ty - cy) * s.zoom + pan.y;
  const sc = base.scale * s.zoom;

  // pointer gestures: pinch zoom, drag-pan when zoomed, swipe to turn
  const ptrs = useRef(new Map<number, { x: number; y: number }>());
  const g = useRef({ dist: 0, zoom: 1, sx: 0, sy: 0, moved: false });
  const onDown = (e: React.PointerEvent) => {
    if (s.mode === 'scroll') return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    g.current.sx = e.clientX; g.current.sy = e.clientY; g.current.moved = false;
    if (ptrs.current.size === 2) { const [a, b] = [...ptrs.current.values()]; g.current.dist = Math.hypot(a.x - b.x, a.y - b.y); g.current.zoom = s.zoom; }
    setGesture(true);
  };
  const onMove = (e: React.PointerEvent) => {
    const p = ptrs.current.get(e.pointerId); if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.current.size === 2) {
      const [a, b] = [...ptrs.current.values()];
      dispatch({ type: 'zoom', zoom: g.current.zoom * (Math.hypot(a.x - b.x, a.y - b.y) / (g.current.dist || 1)) }); g.current.moved = true;
    } else if (s.zoom > 1) { setPan((q) => ({ x: q.x + dx, y: q.y + dy })); g.current.moved = true; }
  };
  const onUp = (e: React.PointerEvent) => {
    ptrs.current.delete(e.pointerId);
    if (ptrs.current.size === 0) {
      setGesture(false);
      const dx = e.clientX - g.current.sx, dy = e.clientY - g.current.sy;
      if (s.zoom === 1 && !g.current.moved && Math.abs(dx) > 60 && Math.abs(dy) < 60) { dispatch({ type: dx < 0 !== rtl ? 'next' : 'prev' }); dhak(); }
    }
  };
  const onWheel = (e: React.WheelEvent) => { if (e.ctrlKey || e.metaKey) { dispatch({ type: 'zoomBy', by: e.deltaY < 0 ? 1.1 : 0.9 }); } };

  // scroll mode bookkeeping
  const els = useRef(new Map<number, HTMLElement>());
  const fromObserver = useRef(false);
  const onSeen = useCallback((i: number) => { fromObserver.current = true; dispatch({ type: 'goto', index: i }); }, []);
  const registerEl = useCallback((i: number, el: HTMLElement | null) => { el ? els.current.set(i, el) : els.current.delete(i); }, []);
  useEffect(() => {
    if (s.mode !== 'scroll') return;
    if (fromObserver.current) { fromObserver.current = false; return; }
    els.current.get(s.index)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [s.index, s.mode]);

  const activeLine = L.state.status === 'idle' ? null : L.state.lineId;
  const playing = L.state.status === 'playing';
  const curLine = useMemo(() => story.panels[s.index]?.lines.find((l) => l.id === L.state.lineId), [story, s.index, L.state.lineId]);
  const spk = (x?: string) => (x ? story.characters[x]?.name[lang] ?? story.characters[x]?.name.en : undefined);
  const modes: [ReadMode, string][] = [['flip', t('rd.flip')], ['panel', t('rd.panel')], ['scroll', t('rd.scroll')]];
  const go = (type: 'next' | 'prev') => { dispatch({ type }); dhak(); };

  return (
    <div className={`rd ${playing ? 'is-playing' : ''}`}>
      <div className="rd-top">
        <Link to={`/title/${id}`} className="rnd sm" aria-label={t('rd.back')}><Left /></Link>
        <div className="ttl serif" lang={lang}>{story.panels.length ? (title) : ''}</div>
        <div className="seg" role="group" aria-label="Reading mode">{modes.map(([m, label]) => <button key={m} type="button" aria-pressed={s.mode === m} onClick={() => dispatch({ type: 'mode', mode: m })}>{label}</button>)}</div>
        <button type="button" className="chip dhak" style={{ height: 40 }} aria-label={t('rd.dir')} onClick={() => dispatch({ type: 'dir', dir: rtl ? 'ltr' : 'rtl' })}>{rtl ? 'RTL ←' : 'LTR →'}</button>
        <label className="sr-only" htmlFor="rl">{t('rd.lang')}</label>
        <select id="rl" className="sel" value={lang} onChange={(e) => setLang(e.target.value as Lang)}>{story.langs.map((l) => <option key={l} value={l}>{LANG_NAMES[l]}</option>)}</select>
        {s.mode !== 'scroll' && <span className="zoom" style={{ display: 'inline-flex', gap: 8 }}>
          <button type="button" className="rnd sm" onClick={() => dispatch({ type: 'zoomBy', by: 0.8 })} aria-label={t('rd.zoomout')}><Minus /></button>
          <button type="button" className="rnd sm" onClick={() => dispatch({ type: 'zoomBy', by: 1.25 })} aria-label={t('rd.zoomin')}><Plus /></button>
        </span>}
      </div>

      <div className="rd-main" style={{ flexDirection: rtl ? 'row-reverse' : 'row' }}>
        <div className="thumbs" role="group" aria-label="Pages">
          {Array.from({ length: pages }, (_, n) => <button key={n} type="button" className={`th${n === page ? ' on' : ''}`} aria-label={`${t('rd.page')} ${n + 1}`} aria-current={n === page ? 'page' : undefined} onClick={() => dispatch({ type: 'gotoPage', page: n })}>{String(n + 1).padStart(2, '0')}</button>)}
        </div>
        <button type="button" className="rd-btn dhak" onClick={() => go(rtl ? 'next' : 'prev')} aria-label={rtl ? t('rd.next') : t('rd.prev')}><Left /></button>
        {s.mode === 'scroll' ? (
          <div className="stage scrollmode" style={{ flex: 1 }}>
            <div className="scroll-wrap">{story.panels.map((_, i) => <ScrollPanel key={i} story={story} idx={i} lang={lang} activeLine={i === s.index ? activeLine : null} onSeen={onSeen} registerEl={registerEl} />)}</div>
          </div>
        ) : (
          <div ref={stageRef} className="stage" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onWheel={onWheel} role="region" aria-label={`${title} — ${t('rd.page')} ${page + 1}/${pages}, ${t('panel')} ${s.index + 1}/${total}`}>
            <div className={`pagebox${gesture ? '' : ' anim'}`} style={{ width: PAGE_W, height: PAGE_H, transform: `translate(${tx}px,${ty}px) scale(${sc})` }}>
              <ComicPage key={page} story={story} lang={lang} page={page} rtl={rtl} activeLine={activeLine} activePanel={s.index} dimOthers={s.mode === 'panel'} peel={page > 0 || s.index > 0} />
            </div>
          </div>
        )}
        <button type="button" className="rd-btn dhak" onClick={() => go(rtl ? 'prev' : 'next')} aria-label={rtl ? t('rd.prev') : t('rd.next')}><Right /></button>
      </div>

      {L.voiceMissing && <div className="vwarn" role="status">{t('ls.novoice')}</div>}
      <div className="lbar" role="group" aria-label="Listen">
        <button type="button" className="rnd dhak" onClick={L.prev} aria-label={t('rd.prev')}><SkipBack /></button>
        <button type="button" className="pri sm dhak" onClick={L.toggle} aria-label={playing ? t('ls.pause') : t('ls.play')}>{playing ? <Pause s={18} /> : <Play s={18} />}{playing ? t('ls.pause') : t('ls.play')}</button>
        <button type="button" className="rnd dhak" onClick={L.next} aria-label={t('rd.next')}><Skip /></button>
        <div className="grow"><div className="tiny" aria-live="off">{t('panel')} {s.index + 1} / {total} · {t('rd.page')} {page + 1}/{pages}</div><div className="prog" style={{ marginTop: 8 }}><i style={{ width: `${((s.index + 1) / total) * 100}%` }} /></div></div>
        <label className="sr-only" htmlFor="rt">{t('ls.speed')}</label>
        <select id="rt" className="sel" value={L.rate} onChange={(e) => L.setRate(Number(e.target.value))}>{[0.75, 1, 1.25, 1.5].map((r) => <option key={r} value={r}>{r}×</option>)}</select>
        <label className="sr-only" htmlFor="sl">{t('ls.sleep')}</label>
        <select id="sl" className="sel" defaultValue="0" onChange={(e) => L.setSleep(Number(e.target.value))}><option value="0">{t('ls.sleep')}</option>{[10, 20, 30].map((m) => <option key={m} value={m}>{m} {t('ls.min')}</option>)}</select>
        <button type="button" className="chip dhak" onClick={() => { L.setAuto(true); setDrive(true); L.play(); }}>{t('ls.drive')}</button>
      </div>
      {drive && <Driving who={spk(curLine?.speaker)} text={curLine ? curLine.text[lang] ?? curLine.text.en ?? '' : story.panels[s.index]?.lines[0]?.text[lang] ?? '…'} playing={playing} progress={`${t('panel')} ${s.index + 1} / ${total}`} onToggle={L.toggle} onPrev={L.prev} onNext={L.next} onClose={() => setDrive(false)} />}
    </div>
  );
}
