import { FormEvent, lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { API_ON, ApiError, api, signOut, useMe, type Me } from '../lib/api';
import { load } from '../lib/storage';

const Moderation = lazy(() => import('./Moderation').then((m) => ({ default: () => <m.ApiModeration embedded /> })));

type Tab = 'profile' | 'admin' | 'owner';
interface UserRow { id: string; email: string; name: string | null; role: Me['role']; created_at: number }
interface AuditRow { id: number; actor_id: string | null; action: string; target: string | null; detail: string | null; at: number }
const ROLES: Me['role'][] = ['reader', 'creator', 'moderator', 'admin'];

function Owner({ me }: { me: Me }) {
  const [users, setUsers] = useState<UserRow[]>([]); const [log, setLog] = useState<AuditRow[]>([]); const [msg, setMsg] = useState('');
  const [email, setEmail] = useState(''); const [role, setRole] = useState<Me['role']>('moderator');
  const refresh = useCallback(async () => {
    try { setUsers((await api<{ items: UserRow[] }>('/api/admin/users')).items); setLog((await api<{ items: AuditRow[] }>('/api/audit')).items); }
    catch (e) { setMsg(e instanceof ApiError ? e.message : 'Failed to load'); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  const setRoleFor = async (em: string, r: Me['role']) => {
    try { await api('/api/admin/role', { method: 'POST', body: JSON.stringify({ email: em, role: r }) }); setMsg(`${em} is now ${r}.`); await refresh(); }
    catch (e) { setMsg(e instanceof ApiError ? e.message : 'Failed'); }
  };
  const grant = (e: FormEvent) => { e.preventDefault(); void setRoleFor(email.trim(), role); setEmail(''); };
  return (
    <div style={{ display: 'grid', gap: 24 }}>
      {msg && <div role="status" className="help" style={{ fontWeight: 600 }}>{msg}</div>}
      <form onSubmit={grant} className="panelbox" style={{ display: 'grid', gap: 12, maxWidth: 520 }}>
        <h2 style={{ margin: 0 }}>Give someone a role</h2>
        <p className="help" style={{ margin: 0 }}>The person must have signed in once. Moderators can review submissions and handle takedowns.</p>
        <input className="inp" type="email" required placeholder="their email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <select className="inp" value={role} onChange={(e) => setRole(e.target.value as Me['role'])} aria-label="Role">{ROLES.map((r) => <option key={r}>{r}</option>)}</select>
        <div><button className="pri sm dhak" type="submit">Save role</button></div>
      </form>
      <div>
        <h2>People</h2>
        {users.map((u) => (
          <div key={u.id} className="panelbox" style={{ marginTop: 8, padding: 14, display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <span>{u.name ? `${u.name} · ` : ''}{u.email}</span>
            <select className="sel" aria-label={`Role for ${u.email}`} value={u.role} disabled={u.id === me.id} onChange={(e) => void setRoleFor(u.email, e.target.value as Me['role'])}>{ROLES.map((r) => <option key={r}>{r}</option>)}</select>
          </div>
        ))}
      </div>
      <div>
        <h2>Activity log</h2>
        {!log.length && <div className="empty">Nothing yet.</div>}
        {log.map((a) => <div key={a.id} className="tiny" style={{ padding: '6px 0', borderBottom: '1px solid var(--hair)' }}>{new Date(a.at).toLocaleString()} · <b>{a.action}</b> {a.target ?? ''} {a.detail ?? ''}</div>)}
      </div>
    </div>
  );
}

export default function Account() {
  const nav = useNavigate();
  const { me, ready } = useMe();
  const [tab, setTab] = useState<Tab>('profile');
  const localName = load<string | null>('cg:user', null);
  const logout = async () => { await signOut(); nav('/'); };
  if (!ready) return <div className="empty">…</div>;
  if (API_ON && !me) return <div className="wrap"><div className="empty">You are signed out. <Link to="/signin" className="lnk ul">Sign in</Link></div></div>;
  if (!API_ON && !localName) return <div className="wrap"><div className="empty"><Link to="/signin" className="lnk ul">Sign in</Link></div></div>;
  const isMod = !!me && (me.role === 'moderator' || me.role === 'admin');
  const isOwner = me?.role === 'admin';
  return (
    <div className="wrap" style={{ paddingBottom: 60 }}>
      <div className="page-h"><h1>Your account</h1></div>
      <div className="tabs" role="tablist">
        <button className="sec sm" role="tab" aria-selected={tab === 'profile'} onClick={() => setTab('profile')}>Profile</button>
        {isMod && <button className="sec sm" role="tab" aria-selected={tab === 'admin'} onClick={() => setTab('admin')}>Admin: takedowns &amp; moderation</button>}
        {isOwner && <button className="sec sm" role="tab" aria-selected={tab === 'owner'} onClick={() => setTab('owner')}>Owner: people &amp; log</button>}
      </div>
      {tab === 'profile' && (
        <div className="panelbox" style={{ maxWidth: 520, display: 'grid', gap: 10 }}>
          <div className="serif" style={{ fontWeight: 600, fontSize: 24 }}>{me?.name || localName || me?.email}</div>
          {me && <div className="tiny">{me.email} · <span className="pill">{me.role}</span></div>}
          <div className="acts"><button className="sec dhak" type="button" onClick={logout}>Sign out</button></div>
        </div>
      )}
      {tab === 'admin' && isMod && <Suspense fallback={<div className="empty">…</div>}><Moderation /></Suspense>}
      {tab === 'owner' && me && isOwner && <Owner me={me} />}
    </div>
  );
}
