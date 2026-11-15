import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Cover } from '../components/Cover';
import { Driving } from '../components/Driving';
import { Pause, Play } from '../components/Icons';
import { useAudioMeta, useCatalog, useStory } from '../lib/data';
import { LANG_NAMES, useI18n } from '../lib/i18n';
import { getPosition } from '../lib/storage';
import { useListen } from '../lib/useListen';
import type { Lang } from '../types';

export function Listen() {
  const { id = '' } = useParams();
  const [sp, setSp] = useSearchParams();
  const { t, pick, ui } = useI18n();
  const { items } = useCatalog();
  const { story, error } = useStory(id);
  const item = items.find((i) => i.id === id);
  const langs = story?.langs ?? [];
  const pref = (sp.get('lang') as Lang) || (getPosition(id)?.lang as Lang) || (ui !== 'en' && langs.includes('hi') ? 'hi' : 'en');
  const lang: Lang = langs.includes(pref) ? pref : langs[0] ?? 'en';
  const meta = useAudioMeta();
  const L = useListen(story, lang, true, { title: item?.title[lang] ?? item?.title.en, artist: 'Comic Gali' });
  const [drive, setDrive] = useState(false);
  const activeRef = useRef<HTMLParagraphElement>(null);

  const lines = useMemo(() => (story ? story.panels.flatMap((p, pi) => p.lines.filter((l) => l.kind !== 'sfx').map((l) => ({ ...l, pi }))) : []), [story]);
  const playing = L.state.status === 'playing';
  const active = lines.find((l) => l.id === L.state.lineId);
  useEffect(() => { if (playing) activeRef.current?.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); }, [L.state.lineId, playing]);

  if (error) return <div className="wrap"><div className="empty">{t('nf')}</div></div>;
  if (!story || !item) return <div className="empty">{t('loading')}</div>;
  const total = story.panels.length;
  const others = items.filter((i) => i.status === 'available' && i.id !== id).slice(0, 3);
  const spk = (s?: string) => (s ? story.characters[s]?.name[lang] ?? story.characters[s]?.name.en : undefined);
  const prog = `${t('panel')} ${L.state.panel + 1} / ${total}`;

  return (
    <div className="wrap" style={{ paddingBottom: 60 }}>
      <div className="crumbs"><Link to="/library">{t('nav.library')}</Link> &nbsp;/&nbsp; <Link to={`/title/${id}`}>{pick(item.title)}</Link></div>
      <div className={`detail ${playing ? 'is-playing' : ''}`}>
        <div className="l"><Cover id={id} title={pick(item.title)} tag="KAHANI" /></div>
        <div className="r">
          <div className="eyebrow">{item.series} · {LANG_NAMES[lang]}</div>
          <h1>{item.title[lang] ?? pick(item.title)}</h1>

          <div className="lines" lang={lang} role="list">
            {lines.map((l) => (
              <p key={l.id} role="listitem" ref={l.id === L.state.lineId ? activeRef : undefined} className={l.id === L.state.lineId ? 'on' : ''}
                 onClick={() => { L.seekPanel(l.pi); L.play(); }} aria-current={l.id === L.state.lineId ? 'true' : undefined}>
                {l.speaker && <span className="who">{spk(l.speaker)}</span>}{l.text[lang] ?? l.text.en}
              </p>
            ))}
          </div>

          <div className="player" role="group" aria-label="Player">
            <button className="pp dhak" type="button" onClick={L.toggle} aria-label={playing ? t('ls.pause') : t('ls.play')}>{playing ? <Pause /> : <Play />}</button>
            <div className="pr">
              <span className="tiny">{L.state.panel + 1}</span>
              <div className="prog" role="progressbar" aria-valuemin={1} aria-valuemax={total} aria-valuenow={L.state.panel + 1} style={{ flex: 1 }}><i style={{ width: `${((L.state.panel + 1) / total) * 100}%` }} /></div>
              <span className="tiny">{total}</span>
            </div>
            <label className="sr-only" htmlFor="rate">{t('ls.speed')}</label>
            <select id="rate" className="sel" value={L.rate} onChange={(e) => L.setRate(Number(e.target.value))}>{[0.75, 1, 1.25, 1.5].map((r) => <option key={r} value={r}>{r}×</option>)}</select>
          </div>
          {L.hasFiles && !meta.reviewed[lang] && <div className="tiny" role="note" style={{ margin: '10px 0 0' }}>{t('ls.ai')}</div>}
          {playing && L.state.source === 'device' && <div className="tiny" role="status" style={{ margin: '10px 0 0' }}>{t('ls.device')}</div>}
          {!L.hasFiles && L.voiceQuality === 'basic' && <div className="vwarn" role="note" style={{ margin: '14px 0 0' }}>{t('ls.tip')}</div>}
          {L.voiceMissing && <div className="vwarn" role="status" style={{ margin: '14px 0 0' }}>{t('ls.novoice')}</div>}
          {!L.supported && <div className="vwarn" role="status" style={{ margin: '14px 0 0' }}>{t('ls.nospeech')}</div>}

          <div className="optrow">
            {langs.map((l) => <button key={l} type="button" lang={l} className={`chip dhak${l === lang ? ' on' : ''}`} aria-pressed={l === lang} onClick={() => setSp({ lang: l })}>{LANG_NAMES[l]}</button>)}
          </div>
          <div className="optrow">
            <label className="sr-only" htmlFor="sl">{t('ls.sleep')}</label>
            <select id="sl" className="sel" onChange={(e) => L.setSleep(Number(e.target.value))} defaultValue="0">
              <option value="0">{t('ls.sleep')}: {t('ls.off')}</option>{[10, 20, 30].map((m) => <option key={m} value={m}>{t('ls.sleep')}: {m} {t('ls.min')}</option>)}
            </select>
            <label style={{ display: 'inline-flex', gap: 8, alignItems: 'center', fontWeight: 600, fontSize: 14 }}><input type="checkbox" checked={L.auto} onChange={(e) => L.setAuto(e.target.checked)} />{t('ls.auto')}</label>
            <button type="button" className="chip dhak" onClick={() => { L.setAuto(true); setDrive(true); L.play(); }}>{t('ls.drive')}</button>
          </div>
          <Link to={`/read/${id}?lang=${lang}`} className="lnk ul" style={{ marginTop: 22 }}>{t('ls.asread')}</Link>
          <p className="help"><Link to={`/review/${id}?lang=${lang}`} className="lnk">{t('ls.review')}</Link></p>

          <div className="sub-h"><h2 className="h2 sm">{t('ls.next')}</h2></div>
          <div className="tiles">{others.map((o) => <Link key={o.id} to={`/listen/${o.id}`} className="tile dhak"><span style={{ display: 'block' }}><b>{pick(o.title)}</b><span>{o.series}</span></span><span style={{ fontSize: 20 }}>→</span></Link>)}</div>
        </div>
      </div>
      {drive && <Driving who={spk(active?.speaker)} text={active ? active.text[lang] ?? active.text.en ?? '' : '…'} playing={playing} progress={prog}
        onToggle={L.toggle} onPrev={L.prev} onNext={L.next} onClose={() => setDrive(false)} />}
    </div>
  );
}
