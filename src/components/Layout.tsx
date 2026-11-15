import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { UI_LANGS, useI18n, type UiLang } from '../lib/i18n';
import { load, save } from '../lib/storage';
import { onSoundChange, setSound, soundOn } from '../lib/sound';
import { Moon, Mute, Speaker, Sun, Type } from './Icons';

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
  const [dys, setDys] = useState(() => load('cg:dys', false));
  const [snd, setSnd] = useState(soundOn());
  useEffect(() => onSoundChange(setSnd), []);
  const toggleDys = () => {
    const n = !dys; setDys(n); save('cg:dys', n);
    document.documentElement.toggleAttribute('data-dys', n);
    try { localStorage.setItem('cg-dys', n ? '1' : '0'); } catch { /* ignore */ }
  };
  return (
    <>
      {!compact && (
        <select className="sel" aria-label="Interface language" value={ui} onChange={(e) => setUi(e.target.value as UiLang)}>
          {UI_LANGS.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
        </select>
      )}
      <button className="rnd dhak" type="button" aria-pressed={dys} aria-label={t('dys')} title={t('dys')} onClick={toggleDys}><Type /></button>
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
  const [user, setUser] = useState(() => load<string | null>('cg:user', null));
  useEffect(() => { const f = () => setUser(load<string | null>('cg:user', null)); window.addEventListener('storage', f); return () => window.removeEventListener('storage', f); }, []);
  return (
    <>
      <a href="#main" className="skip">Skip to content</a>
      <header className="nav wrap">
        <Logo />
        <nav aria-label="Main">
          <NavLink to="/library">{t('nav.comics')}</NavLink>
          <NavLink to="/library?f=kahani">{t('nav.kahani')}</NavLink>
          <NavLink to="/submit">{t('nav.submit')}</NavLink>
        </nav>
        <div className="nav-r">
          <Controls />
          <Link to="/signin" className="pri sm">{user ? user : t('signin')}</Link>
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
