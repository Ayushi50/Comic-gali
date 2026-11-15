import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { API_ON, ApiError, api, apiUrl, getMe, syncWithAccount, useConfig } from '../lib/api';
import { Controls, Logo } from '../components/Layout';
import { Cover } from '../components/Cover';
import { useI18n } from '../lib/i18n';
import { load, save } from '../lib/storage';

/** With the API on: email magic link or Google. Without it: a display name kept on this device. Always: continue without signing in. */
export function SignIn() {
  const { t } = useI18n();
  const nav = useNavigate();
  const [name, setName] = useState(load<string | null>('cg:user', '') ?? '');
  const cfg = useConfig();
  const [sp] = useSearchParams();
  const [email, setEmail] = useState(''); const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false);
  const submit = (e: FormEvent) => { e.preventDefault(); save('cg:user', name.trim() || null); nav('/library'); };
  const magic = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true); setMsg('');
    try { const r = await api<{ message: string }>('/api/auth/magic', { method: 'POST', body: JSON.stringify({ email }) }); setMsg(r.message); }
    catch (x) { setMsg(x instanceof ApiError ? x.message : 'Could not send the link. Try again later.'); }
    setBusy(false);
  };
  // Already signed in (returned from the email link or Google): remember the name locally, merge local data, go on.
  useEffect(() => {
    if (!API_ON) return;
    void getMe().then(async (u) => { if (u) { save('cg:user', u.name || u.email.split('@')[0]); await syncWithAccount(); nav('/library'); } });
  }, [nav]);
  return (
    <div className="signin">
      <div className="l">
        <div><Logo /><h2>{t('si.tag')}</h2></div>
        <div className="fan-s" aria-hidden="true">
          <div style={{ width: '30%', transform: 'rotate(-7deg)' }}><Cover id="a" title="" tag="" variant={0} /></div>
          <div style={{ width: '30%', transform: 'rotate(2deg)' }}><Cover id="b" title="" tag="" variant={2} /></div>
          <div style={{ width: '30%', transform: 'rotate(8deg)' }}><Cover id="c" title="" tag="" variant={4} /></div>
        </div>
      </div>
      <div className="r">
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}><Controls compact /></div>
        {API_ON ? (
          <form onSubmit={magic}>
            <div><h1 className="h2 sm">{t('si.h')}</h1><p className="muted" style={{ margin: '8px 0 0' }}>{t('si.sub')}</p></div>
            {sp.get('error') && <div role="alert" style={{ color: 'var(--c2)', fontWeight: 600 }}>That sign-in link did not work or has expired. Ask for a new one.</div>}
            {cfg?.magicLink && <>
              <div><label className="lbl" htmlFor="em">{t('si.email')}</label><input id="em" className="inp" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></div>
              <button className="pri dhak" type="submit" disabled={busy}>{t('si.magic')}</button>
            </>}
            {cfg?.google && <a className="sec dhak" style={{ height: 48, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }} href={apiUrl('/api/auth/google')}>{t('si.google')}</a>}
            {cfg && !cfg.magicLink && !cfg.google && <p className="help">Sign-in is not set up on this server yet.</p>}
            {msg && <div role="status" className="help">{msg}</div>}
            <Link to="/library" className="lnk ul">{t('si.guest')}</Link>
            <p className="help">{t('si.sync')}</p>
          </form>
        ) : (
        <form onSubmit={submit}>
          <div><h1 className="h2 sm">{t('si.h')}</h1><p className="muted" style={{ margin: '8px 0 0' }}>{t('si.sub')}</p></div>
          <div><label className="lbl" htmlFor="nm">{t('si.name')}</label><input id="nm" className="inp" value={name} onChange={(e) => setName(e.target.value)} autoComplete="given-name" maxLength={30} /></div>
          <button className="pri dhak" type="submit">{t('si.go')}</button>
          <Link to="/library" className="lnk ul">{t('si.guest')}</Link>
          <p className="help">{t('si.note')}</p>
        </form>
        )}
      </div>
    </div>
  );
}
