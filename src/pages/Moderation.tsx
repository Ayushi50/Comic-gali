import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { loadSubmissions, setStatus, type Submission } from '../lib/submissions';

/** Moderation queue. Local-only stub: in production this must sit behind real authentication (see docs/BACKEND_STUB.md). */
export default function Moderation() {
  const [list, setList] = useState<Submission[]>([]);
  const refresh = () => loadSubmissions().then(setList);
  useEffect(() => { void refresh(); }, []);
  const act = async (id: string, s: Submission['status']) => { await setStatus(id, s); await refresh(); };
  return (
    <div className="wrap" style={{ paddingBottom: 60 }}>
      <div className="page-h"><h1>Moderation queue</h1></div>
      <p className="help" style={{ maxWidth: 640 }}>Prototype: submissions are stored in this browser only and this page is not password-protected. Before launch, move it behind authentication and a real database.</p>
      {!list.length && <div className="empty">Nothing waiting. <Link to="/submit" className="lnk ul">Submit a test work</Link></div>}
      <div style={{ display: 'grid', gap: 16, marginTop: 24 }}>
        {list.map((s) => (
          <div key={s.id} className="panelbox">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div><div className="serif" style={{ fontWeight: 600, fontSize: 24 }}>{s.title}</div><div className="tiny">{s.creator} · {s.lang} · {s.license} · {new Date(s.at).toLocaleString()}</div></div>
              <span className={`pill ${s.status === 'approved' ? 'ok' : ''}`}>{s.status}</span>
            </div>
            <div style={{ display: 'flex', gap: 8, margin: '14px 0', overflowX: 'auto' }}>{s.pages.map((p, i) => <img key={i} src={p} alt={`Page ${i + 1} of ${s.title}`} style={{ height: 120, borderRadius: 6, border: '1.5px solid var(--hair)' }} />)}</div>
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
