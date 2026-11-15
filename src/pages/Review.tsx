import { useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useAudioMeta, useCatalog, useStory } from '../lib/data';
import { LANG_NAMES, useI18n } from '../lib/i18n';
import { load, save } from '../lib/storage';
import type { Lang } from '../types';

/** For native speakers: each clip beside its text, with a note box. Notes stay on this device until copied out. */
export default function Review() {
  const { id = '' } = useParams();
  const [sp, setSp] = useSearchParams();
  const { pick } = useI18n();
  const { items } = useCatalog();
  const { story, error } = useStory(id);
  const meta = useAudioMeta();
  const key = `cg:review:${id}`;
  const [notes, setNotes] = useState<Record<string, string>>(() => load(key, {}));
  const [copied, setCopied] = useState(false);
  const lang = ((sp.get('lang') as Lang) || story?.langs[0] || 'en') as Lang;
  const rows = useMemo(() => (story ? story.panels.flatMap((p, pi) => p.lines.filter((l) => l.kind !== 'sfx').map((l) => ({ ...l, pi }))) : []), [story]);
  if (error) return <div className="wrap"><div className="empty">Not found.</div></div>;
  if (!story) return <div className="empty">…</div>;
  const title = pick(items.find((i) => i.id === id)?.title) || id;
  const setNote = (lid: string, v: string) => { const n = { ...notes, [lid]: v }; if (!v) delete n[lid]; setNotes(n); save(key, n); };
  const copy = async () => { const out = JSON.stringify({ title: id, lang, notes }, null, 2); try { await navigator.clipboard.writeText(out); setCopied(true); } catch { window.prompt('Copy these notes:', out); } };
  const hasAudio = rows.some((r) => r.audio?.[lang]);
  return (
    <div className="wrap" style={{ paddingBottom: 60 }}>
      <div className="crumbs"><Link to={`/title/${id}`}>{title}</Link></div>
      <div className="page-h"><h1>Review: {title}</h1></div>
      <div className="optrow">{story.langs.map((l) => <button key={l} type="button" lang={l} className={`chip dhak${l === lang ? ' on' : ''}`} aria-pressed={l === lang} onClick={() => setSp({ lang: l })}>{LANG_NAMES[l]}</button>)}</div>
      <p className="help" style={{ maxWidth: 680 }}>{hasAudio ? (meta.reviewed[lang] ? `Reviewed: ${meta.reviewed[lang]}.` : 'AI voice, unreviewed.') : 'No generated audio for this language (device voice only).'} Play each clip, check the pronunciation and the wording, and note anything wrong. Notes stay on this device until you copy them.</p>
      <div style={{ display: 'grid', gap: 12, marginTop: 20 }}>
        {rows.map((r) => (
          <div key={r.id} className="panelbox" style={{ display: 'grid', gap: 8 }}>
            <div className="tiny">Panel {r.pi + 1} · {r.id} · {r.kind}{r.speaker ? ` · ${story.characters[r.speaker]?.name[lang] ?? r.speaker}` : ''}</div>
            <div lang={lang} style={{ fontSize: 18, lineHeight: 1.6 }}>{r.text[lang] ?? r.text.en}</div>
            {r.audio?.[lang] ? <audio controls preload="none" src={r.audio[lang]} aria-label={`Clip for ${r.id}`} /> : <div className="tiny">No recording</div>}
            <label className="sr-only" htmlFor={`n-${r.id}`}>Note for {r.id}</label>
            <input id={`n-${r.id}`} className="inp" placeholder="Pronunciation or wording issue (optional)" value={notes[r.id] ?? ''} onChange={(e) => setNote(r.id, e.target.value)} />
          </div>
        ))}
      </div>
      <div className="acts"><button type="button" className="pri sm dhak" onClick={copy}>Copy my notes</button>{copied && <span role="status" className="tiny">Copied. Send them to the project owner.</span>}</div>
    </div>
  );
}
