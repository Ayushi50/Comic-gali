import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { API_ON, ApiError, api, apiUrl, useMe } from '../lib/api';
import { loadSubmissions, previewUrls, setStatus, type Submission } from '../lib/submissions';

interface Row { id: string; title: string; creator: string; lang: string; license: string; status: string; reason?: string; created_at: number }
interface Detail extends Row { email: string; panel_text: string; pages: string[] }
interface Takedown { id: string; title_id: string | null; name: string; email: string; reason: string; status: string; created_at: number }

/** Real moderation (API on). Every call is role-checked on the server; hiding the UI is only a courtesy. */
function ApiModeration() {
  const { me, ready } = useMe();
  const [rows, setRows] = useState<Row[]>([]); const [open, setOpen] = useState<Detail | null>(null);
  const [tds, setTds] = useState<Takedown[]>([]); const [err, setErr] = useState(''); const [reason, setReason] = useState('');
  const ok = me && (me.role === 'moderator' || me.role === 'admin');
  const refresh = useCallback(async () => {
    try { setRows((await api<{ items: Row[] }>('/api/submissions?status=pending')).items); setTds((await api<{ items: Takedown[] }>('/api/takedowns')).items); setErr(''); }
    catch (e) { setErr(e instanceof ApiError ? e.message : 'Failed to load'); }
  }, []);
  useEffect(() => { if (ok) void refresh(); }, [ok, refresh]);
  if (!ready) return <div className="empty">…</div>;
  if (!me) return <div className="wrap"><div className="empty">Moderators must sign in. <Link to="/signin" className="lnk ul">Sign in</Link></div></div>;
  if (!ok) return <div className="wrap"><div className="empty">Your account does not have moderator access.</div></div>;
  const show = async (id: string) => { setReason(''); setOpen(await api<Detail>(`/api/submissions/${id}`)); };
  const act = async (verb: 'approve' | 'reject') => {
    if (!open) return;
    try { await api(`/api/submissions/${open.id}/${verb}`, { method: 'POST', body: JSON.stringify({ reason }) }); setOpen(null); await refresh(); }
    catch (e) { setErr(e instanceof ApiError ? e.message : 'Failed'); }
  };
  const handle = async (id: string, unpublish: boolean) => {
    try { const r = await api<{ staticTitle: boolean }>(`/api/takedowns/${id}/handle`, { method: 'POST', body: JSON.stringify(unpublish ? { unpublish: true } : { dismiss: true }) });
      if (r.staticTitle) setErr('That title ships in the static catalog: remove it from content-src and redeploy.'); await refresh(); } catch (e) { setErr(e instanceof ApiError ? e.message : 'Failed'); }
  };
  const upload = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); const f = new FormData(e.currentTarget);
    try { await fetch(apiUrl('/api/recordings'), { method: 'POST', body: f, credentials: 'same-origin' }).then(async (r) => { if (!r.ok) throw new Error(((await r.json()) as { error: string }).error); }); setErr('Recording saved. It now overrides generated audio for that line.'); e.currentTarget.reset(); }
    catch (x) { setErr(x instanceof Error ? x.message : 'Failed'); }
  };
  return (
    <div className="wrap" style={{ paddingBottom: 60 }}>
      <div className="page-h"><h1>Moderation queue</h1></div>
      <p className="help">Signed in as {me.email} ({me.role}).</p>
      {err && <div role="status" className="help" style={{ fontWeight: 600 }}>{err}</div>}
      {!rows.length && <div className="empty">Nothing waiting.</div>}
      <div style={{ display: 'grid', gap: 16, marginTop: 24 }}>
        {rows.map((s) => (
          <div key={s.id} className="panelbox">
            <div className="serif" style={{ fontWeight: 600, fontSize: 24 }}>{s.title}</div>
            <div className="tiny">{s.creator} · {s.lang} · {s.license} · {new Date(s.created_at).toLocaleString()}</div>
            <div className="acts"><button className="sec dhak" style={{ height: 44 }} type="button" onClick={() => show(s.id)}>Review</button></div>
            {open?.id === s.id && (<div style={{ marginTop: 12 }}>
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto' }}>{open.pages.map((p, i) => <img key={i} src={p} alt={`Page ${i + 1} of ${open.title}`} style={{ height: 160, borderRadius: 6, border: '1.5px solid var(--hair)' }} />)}</div>
              {open.panel_text && <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: 14 }}>{open.panel_text}</pre>}
              <div className="tiny">Contact: {open.email}</div>
              <label className="lbl" htmlFor="rs">Reason (required to reject; sent to the creator)</label>
              <textarea id="rs" className="inp" value={reason} onChange={(e) => setReason(e.target.value)} />
              <div className="acts"><button className="pri sm dhak" type="button" onClick={() => act('approve')}>Approve and publish</button><button className="sec dhak" style={{ height: 44 }} type="button" onClick={() => act('reject')}>Reject</button></div>
            </div>)}
          </div>
        ))}
      </div>
      <div className="page-h" style={{ marginTop: 40 }}><h2>Takedown requests</h2></div>
      {!tds.length && <div className="empty">None.</div>}
      {tds.map((t) => (
        <div key={t.id} className="panelbox" style={{ marginTop: 12 }}>
          <b>{t.title_id ?? '(no title)'}</b> · {t.name} · {t.email} · <span className="pill">{t.status}</span>
          <p style={{ whiteSpace: 'pre-wrap' }}>{t.reason}</p>
          {t.status === 'open' && <div className="acts" style={{ marginTop: 0 }}><button className="pri sm dhak" type="button" onClick={() => handle(t.id, true)}>Unpublish title and close</button><button className="sec dhak" style={{ height: 44 }} type="button" onClick={() => handle(t.id, false)}>Dismiss</button></div>}
        </div>
      ))}
      <div className="page-h" style={{ marginTop: 40 }}><h2>Upload a human recording</h2></div>
      <form onSubmit={upload} className="panelbox" style={{ display: 'grid', gap: 12, maxWidth: 520 }}>
        <p className="help" style={{ margin: 0 }}>Replaces generated audio. One recording per line (language + line id). MP3, M4A, OGG or WebM, up to 1.4 MB.</p>
        <input className="inp" name="titleId" placeholder="title id, e.g. monkey-crocodile" required pattern="[a-z0-9-]+" />
        <input className="inp" name="lang" placeholder="language code, e.g. hi" required pattern="[a-z]{2}" />
        <input className="inp" name="lineId" placeholder="line id, e.g. p1l1" required pattern="p[0-9]+l[0-9]+" />
        <input className="inp" style={{ paddingTop: 14 }} name="file" type="file" accept="audio/*" required />
        <div><button className="pri sm dhak" type="submit">Upload</button></div>
      </form>
    </div>
  );
}

/** Local-only prototype used when no backend is configured. Not an admin tool. */
function LocalModeration() {
  const [list, setList] = useState<Submission[]>([]);
  const [urls, setUrls] = useState<Record<string, string[]>>({});
  const refresh = () => loadSubmissions().then((l) => { setList(l); setUrls(Object.fromEntries(l.map((s) => [s.id, previewUrls(s)]))); });
  useEffect(() => { void refresh(); return () => Object.values(urls).flat().forEach((u) => u.startsWith('blob:') && URL.revokeObjectURL(u)); /* eslint-disable-next-line */ }, []);
  const act = async (id: string, s: Submission['status']) => { await setStatus(id, s); await refresh(); };
  return (
    <div className="wrap" style={{ paddingBottom: 60 }}>
      <div className="page-h"><h1>Moderation queue</h1></div>
      <p className="help" style={{ maxWidth: 640 }}>No backend is configured: submissions are stored in this browser only and this page is not password-protected. Set <code>VITE_API=1</code> and deploy the API (docs/BACKEND.md) for real moderation.</p>
      {!list.length && <div className="empty">Nothing waiting. <Link to="/submit" className="lnk ul">Submit a test work</Link></div>}
      <div style={{ display: 'grid', gap: 16, marginTop: 24 }}>
        {list.map((s) => (
          <div key={s.id} className="panelbox">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div><div className="serif" style={{ fontWeight: 600, fontSize: 24 }}>{s.title}</div><div className="tiny">{s.creator} · {s.lang} · {s.license} · {new Date(s.at).toLocaleString()}</div></div>
              <span className={`pill ${s.status === 'approved' ? 'ok' : ''}`}>{s.status}</span>
            </div>
            <div style={{ display: 'flex', gap: 8, margin: '14px 0', overflowX: 'auto' }}>{(urls[s.id] ?? []).map((p, i) => <img key={i} src={p} alt={`Page ${i + 1} of ${s.title}`} style={{ height: 120, borderRadius: 6, border: '1.5px solid var(--hair)' }} />)}</div>
            {s.panelText && <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: '0 0 14px', fontSize: 14 }}>{s.panelText}</pre>}
            <div className="acts" style={{ marginTop: 0 }}>
              <button className="pri sm dhak" type="button" onClick={() => act(s.id, 'approved')}>Approve</button>
              <button className="sec dhak" style={{ height: 44 }} type="button" onClick={() => act(s.id, 'rejected')}>Reject</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
export default function Moderation() { return API_ON ? <ApiModeration /> : <LocalModeration />; }
