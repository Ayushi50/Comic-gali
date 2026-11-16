import { FormEvent, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useCatalog } from '../lib/data';
import { useI18n } from '../lib/i18n';
import { load, save } from '../lib/storage';
import { API_ON, ApiError, api, useConfig } from '../lib/api';
import { Turnstile } from '../components/Turnstile';

/** Takedown contact comes from config: VITE_TAKEDOWN_EMAIL at build time, or /api/config (TAKEDOWN_EMAIL) when the API is on. */
const BUILD_TAKEDOWN_EMAIL = (import.meta.env.VITE_TAKEDOWN_EMAIL as string | undefined) || '';

export function Static({ page }: { page: 'takedown' | 'sources' | '404' }) {
  const { t, pick } = useI18n();
  const { items } = useCatalog();
  const [sp] = useSearchParams();
  const [sent, setSent] = useState(false);
  const cfg = useConfig();
  const TAKEDOWN_EMAIL = cfg?.takedownEmail || BUILD_TAKEDOWN_EMAIL;
  const [ts, setTs] = useState(''); const [tsKey, setTsKey] = useState(0); const [err, setErr] = useState('');
  const [form, setForm] = useState({ title: sp.get('title') ?? '', name: '', email: '', reason: '', good: false });

  if (page === '404') return <div className="wrap"><div className="empty">{t('nf')} <Link to="/" className="lnk ul">Home</Link></div></div>;

  if (page === 'takedown') {
    const submit = async (e: FormEvent) => {
      e.preventDefault(); setErr('');
      if (API_ON) {
        try { await api('/api/takedown', { method: 'POST', body: JSON.stringify({ ...form, 'cf-turnstile-response': ts }) }); setSent(true); }
        catch (x) { setErr(x instanceof ApiError ? x.message : 'Could not send. Please email us instead.'); setTs(''); setTsKey((k) => k + 1); /* a Turnstile token works once */ }
        return;
      }
      save('cg:takedowns', [...load<unknown[]>('cg:takedowns', []), { ...form, at: new Date().toISOString() }]);
      setSent(true);
    };
    const mail = `mailto:${TAKEDOWN_EMAIL || ''}?subject=${encodeURIComponent('Takedown request: ' + form.title)}&body=${encodeURIComponent(`${form.reason}\n\n— ${form.name} (${form.email})`)}`;
    return (
      <div className="wrap" style={{ paddingBottom: 60 }}>
        <div className="page-h"><h1>{t('takedown.h')}</h1></div>
        <div className="prose" style={{ marginTop: 24 }}>
          <p>If you own the rights to something shown on Comic Gali and did not agree to it being here, tell us. We take the title down first and ask questions after. Content that is public domain, openly licensed, or submitted by its creator is credited on its page; a credit or licence that is wrong is also a reason to write.</p>
          {sent ? (
            API_ON ? <div className="panelbox" role="status"><p style={{ margin: 0 }}><b>Thank you — your request was received.</b> A moderator will review it and we will email you.</p></div> :
            <div className="panelbox"><p style={{ margin: 0 }}><b>Request noted on this device.</b> No server is configured, so to deliver it please also send it by email:</p>
              {TAKEDOWN_EMAIL ? <p><a className="pri sm" href={mail}>Open email draft</a></p> : <p className="help">No takedown address is configured yet (set VITE_TAKEDOWN_EMAIL).</p>}</div>
          ) : (
            <form onSubmit={submit} className="panelbox" style={{ display: 'grid', gap: 16 }}>
              <div><label className="lbl" htmlFor="tt">Title concerned</label>
                <select id="tt" className="inp" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required><option value="">Choose…</option>{items.map((i) => <option key={i.id} value={i.id}>{pick(i.title)}</option>)}</select></div>
              <div className="grid2"><div><label className="lbl" htmlFor="tn">Your name</label><input id="tn" className="inp" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div><label className="lbl" htmlFor="te">Email</label><input id="te" className="inp" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div></div>
              <div><label className="lbl" htmlFor="tr">What is the problem?</label><textarea id="tr" className="inp" required value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></div>
              <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}><input type="checkbox" required checked={form.good} onChange={(e) => setForm({ ...form, good: e.target.checked })} style={{ marginTop: 4 }} /><span>I am the rights holder, or authorised to act for them, and the information above is accurate.</span></label>
              <Turnstile key={tsKey} siteKey={API_ON ? cfg?.turnstileSiteKey : null} onToken={setTs} />
              {err && <div role="alert" style={{ color: 'var(--c2)', fontWeight: 600 }}>{err}</div>}
              <div><button className="pri dhak" type="submit">Send request</button></div>
            </form>
          )}
          {TAKEDOWN_EMAIL && <p className="help">Direct contact: <a href={`mailto:${TAKEDOWN_EMAIL}`}>{TAKEDOWN_EMAIL}</a></p>}
        </div>
      </div>
    );
  }

  const withSrc = items.filter((i) => i.status === 'available');
  const soon = items.filter((i) => i.status === 'coming_soon');
  return (
    <div className="wrap" style={{ paddingBottom: 60 }}>
      <div className="page-h"><h1>{t('sources.h')}</h1></div>
      <div className="prose" style={{ marginTop: 24 }}>
        <p>Every readable title lists its credit, source and licence on its own page. This is the combined list. The full research notes are in <code>SOURCES.md</code> in the project.</p>
        <h2>Readable now</h2>
        <table><thead><tr><th>Title</th><th>Rights</th><th>Source</th><th>Checked</th></tr></thead><tbody>
          {withSrc.map((i) => <tr key={i.id}><td><Link to={`/title/${i.id}`}>{pick(i.title)}</Link></td><td>{i.license?.name}</td><td>{i.sourceUrl ? <a href={i.sourceUrl} target="_blank" rel="noreferrer">{i.sourceName}</a> : i.sourceName}</td><td>{i.verifiedOn}</td></tr>)}
        </tbody></table>
        <h2>Coming soon — not yet licensed</h2>
        <p>These shelves carry no artwork or text from the publishers. They exist to show what we are asking for.</p>
        <table><thead><tr><th>Title</th><th>Publisher</th><th>Status</th></tr></thead><tbody>
          {soon.map((i) => <tr key={i.id}><td>{pick(i.title)}</td><td>{i.publisher}</td><td>Needs licence</td></tr>)}
        </tbody></table>
        <h2>Fonts and tools</h2>
        <p>Typefaces: Fraunces, Inter, Atkinson Hyperlegible and the Noto families (SIL Open Font License), loaded from Google Fonts. Speech uses the browser’s built-in voices; nothing is sent to a server.</p>
      </div>
    </div>
  );
}
