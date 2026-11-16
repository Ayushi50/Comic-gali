import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { UI_LANGS, useI18n, type UiLang } from '../lib/i18n';
import { API_ON, firstName, getMe, signOut, syncWithAccount } from '../lib/api';
import { load, save } from '../lib/storage';
import { onSoundChange, setSound, soundOn } from '../lib/sound';
import { Moon, Mute, Speaker, Sun } from './Icons';

export function useTheme() {
  const [theme, setTheme] = useState(() => document.documentElement.getAttribute('data-theme') ?? 'light');
  const toggle = () => {
    const n = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', n);
    try { localStorage.setItem('cg-theme', n); } catch { /* ignore */ }
    setTheme(n);
  };
  return { theme, toggle };
}

export function Controls({ compact = false }: { compact?: boolean }) {
  const { t, ui, setUi } = useI18n();
  const { theme, toggle } = useTheme();
  const [snd, setSnd] = useState(soundOn());
  useEffect(() => onSoundChange(setSnd), []);
  return (
    <>
      {!compact && (
        <select className="sel" aria-label="Interface language" value={ui} onChange={(e) => setUi(e.target.value as UiLang)}>
          {UI_LANGS.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
        </select>
      )}
      <button className="rnd dhak" type="button" aria-pressed={snd} aria-label={t('sound')} title={t('sound')} onClick={() => setSound(!snd)}>{snd ? <Speaker /> : <Mute />}</button>
      <button className="rnd dhak" type="button" aria-label={t('theme')} title={t('theme')} onClick={toggle}>{theme === 'dark' ? <Sun /> : <Moon />}</button>
    </>
  );
}

export function Logo() {
  return <Link to="/" className="logo">Comic <i>Gali</i></Link>;
}

export function Layout() {
  const { t } = useI18n();
  const nav = useNavigate();
  const [user, setUser] = useState(() => load<string | null>('cg:user', null));
  // After the emailed link / Google redirect the session cookie exists but localStorage does not: adopt the account name here.
  useEffect(() => {
    if (!API_ON) return;
    void getMe().then(async (u) => {
      if (u) { const n = firstName(u); if (load<string | null>('cg:user', null) !== n) { save('cg:user', n); setUser(n); await syncWithAccount(); } }
      else if (load<string | null>('cg:user', null)) { save('cg:user', null); setUser(null); }
    });
  }, []);
  useEffect(() => { const f = () => setUser(load<string | null>('cg:user', null)); window.addEventListener('storage', f); return () => window.removeEventListener('storage', f); }, []);
  useEffect(() => { const f = () => setUser(null); window.addEventListener('cg:signout', f); return () => window.removeEventListener('cg:signout', f); }, []);
  const logout = async () => { await signOut(); nav('/'); };
  return (
    <>
      <a href="#main" className="skip">Skip to content</a>
      <header className="nav wrap">
        <Logo />
        <nav aria-label="Main">
          <NavLink to="/library?f=comics">{t('nav.comics')}</NavLink>
          <NavLink to="/library">{t('nav.kahani')}</NavLink>
          <NavLink to="/submit">{t('nav.submit')}</NavLink>
        </nav>
        <div className="nav-r">
          <Controls />
          {user ? <>
            <Link to="/account" className="pri sm">{user.split(/\s+/)[0]}</Link>
            <button type="button" className="sec sm" onClick={logout}>{t('signout')}</button>
          </> : <Link to="/signin" className="pri sm">{t('signin')}</Link>}
        </div>
      </header>
      <main id="main"><Outlet /></main>
      <footer className="foot wrap">
        <span>© Comic Gali · <Link to="/sources">{t('foot.sources')}</Link></span>
        <nav aria-label="Footer" style={{ display: 'flex', gap: 20 }}>
          <Link to="/takedown">{t('foot.takedown')}</Link>
          <Link to="/submit">{t('foot.submit')}</Link>
        </nav>
        <span className="tag">{t('foot.tag')}</span>
        {t('mt.note') && <span className="tiny" role="note" lang="hi" style={{ display: 'block', marginTop: 8 }}>{t('mt.note')}</span>}
      </footer>
    </>
  );
}
