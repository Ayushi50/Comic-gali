import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CoverCard } from '../components/CoverCard';
import { Cover } from '../components/Cover';
import { Search } from '../components/Icons';
import { useCatalog } from '../lib/data';
import { LANG_NAMES, useI18n } from '../lib/i18n';
import { recentPositions } from '../lib/storage';
import { LANGS, type CatalogItem, type Lang, type Rights } from '../types';

const RIGHTS: Rights[] = ['public_domain', 'open_license', 'creator_submitted', 'needs_license'];
const RIGHTS_LABEL: Record<Rights, string> = { public_domain: 'Public domain', open_license: 'Open licence (CC)', creator_submitted: 'Creator submitted', needs_license: 'Needs licence' };

export function Library() {
  const { t, pick } = useI18n();
  const { items, ready, error } = useCatalog();
  const [sp, setSp] = useSearchParams();
  const [q, setQ] = useState('');
  const f = sp.get('f') === 'comics' ? 'comics' : 'kahani';
  const [lang, setLang] = useState<Lang | ''>('');
  const [genre, setGenre] = useState('');
  const [age, setAge] = useState('');
  const [rights, setRights] = useState<Rights | ''>('');
  const last = recentPositions()[0];
  const lastItem = last && items.find((i) => i.id === last.id);

  const genres = useMemo(() => [...new Set(items.flatMap((i) => i.genres))].sort(), [items]);
  const match = (i: CatalogItem) => {
    const text = [...Object.values(i.title), i.series, i.publisher, ...i.genres].join(' ').toLowerCase();
    if (q && !text.includes(q.trim().toLowerCase())) return false;
    if (f === 'comics' && i.status !== 'coming_soon') return false;
    if (f === 'kahani' && i.status !== 'available') return false;
    if (lang && !i.langs.includes(lang)) return false;
    if (genre && !i.genres.includes(genre)) return false;
    if (age && i.age !== age) return false;
    if (rights && i.rights !== rights) return false;
    return true;
  };
  const shown = items.filter(match);
  const now = shown.filter((i) => i.status === 'available');
  const soon = shown.filter((i) => i.status === 'coming_soon');
  const chips: [string, string][] = [['kahani', t('f.kahani')], ['comics', t('f.comics')]];

  return (
    <div className="wrap">
      <div className="page-h">
        <h1>{t('lib.title')}</h1>
        <div className="search">
          <label className="sr-only" htmlFor="q">{t('lib.search')}</label>
          <Search /><input id="q" className="inp" type="search" placeholder={t('lib.search')} value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>
      <div className="chips" role="group" aria-label="Filter">
        {chips.map(([id, label]) => (
          <button key={id} type="button" className={`chip dhak${f === id ? ' on' : ''}`} aria-pressed={f === id} onClick={() => setSp(id === 'kahani' ? {} : { f: id })}>{label}</button>
        ))}
      </div>
      <div className="filters">
        <div><label className="sr-only" htmlFor="fl">{t('lib.lang')}</label>
          <select id="fl" className="inp" value={lang} onChange={(e) => setLang(e.target.value as Lang | '')}><option value="">{t('lib.lang')}: {t('lib.any')}</option>{LANGS.map((l) => <option key={l} value={l}>{LANG_NAMES[l]}</option>)}</select></div>
        <div><label className="sr-only" htmlFor="fg">{t('lib.genre')}</label>
          <select id="fg" className="inp" value={genre} onChange={(e) => setGenre(e.target.value)}><option value="">{t('lib.genre')}: {t('lib.any')}</option>{genres.map((g) => <option key={g}>{g}</option>)}</select></div>
        <div><label className="sr-only" htmlFor="fa">{t('lib.age')}</label>
          <select id="fa" className="inp" value={age} onChange={(e) => setAge(e.target.value)}><option value="">{t('lib.age')}: {t('lib.any')}</option>{['all', '5+', '8+', '12+'].map((a) => <option key={a}>{a}</option>)}</select></div>
        <div><label className="sr-only" htmlFor="fr">{t('lib.rights')}</label>
          <select id="fr" className="inp" value={rights} onChange={(e) => setRights(e.target.value as Rights | '')}><option value="">{t('lib.rights')}: {t('lib.any')}</option>{RIGHTS.map((r) => <option key={r} value={r}>{RIGHTS_LABEL[r]}</option>)}</select></div>
      </div>

      {lastItem && last && (
        <Link to={`/read/${lastItem.id}`} className="ticket dhak" style={{ marginTop: 28 }}>
          <div className="tc"><div style={{ width: 56 }}><Cover id={lastItem.id} title="" tag="" /></div></div>
          <div className="tb"><div className="eyebrow" style={{ fontSize: 11 }}>{t('lib.continue')}</div>
            <div className="serif" style={{ fontWeight: 600, fontSize: 24, marginTop: 4 }}>{pick(lastItem.title)}</div>
            <div className="bar"><i style={{ width: `${Math.round(((last.pos.index + 1) / 8) * 100)}%` }} /></div></div>
          <span className="go">{t('lib.continue.go')} →</span>
        </Link>
      )}

      {error && <div className="empty">Catalog load nahi hua.</div>}
      {ready && !shown.length && <div className="empty">{t('lib.none')}</div>}
      {now.length > 0 && (
        <section className="sect" style={{ paddingTop: 56 }}>
          <div className="sect-h"><h2 className="h2 sm">{t('f.kahani')}</h2></div>
          <div className="cover-grid">{now.map((i) => <CoverCard key={i.id} item={i} />)}</div>
        </section>
      )}
      {soon.length > 0 && (
        <section className="sect" style={{ paddingTop: 56 }}>
          <div className="sect-h"><h2 className="h2 sm">{t('lib.soonshelf')}</h2></div>
          <div className="cover-grid">{soon.map((i) => <CoverCard key={i.id} item={i} />)}</div>
        </section>
      )}
      <div style={{ height: 40 }} />
    </div>
  );
}
