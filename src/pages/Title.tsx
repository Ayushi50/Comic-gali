import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Cover } from '../components/Cover';
import { CoverCard } from '../components/CoverCard';
import { Bookmark } from '../components/Icons';
import { useCatalog } from '../lib/data';
import { LANG_NAMES, useI18n } from '../lib/i18n';
import { formatBytes, hasPack, offlineSupported, packSize, removePack, savePack } from '../lib/offline';
import { getFavs, getPosition, load, save, toggleFav } from '../lib/storage';

const RIGHTS_LABEL: Record<string, string> = { public_domain: 'Public domain', open_license: 'Open licence', creator_submitted: 'Creator submitted', needs_license: 'Needs licence' };

export function Title() {
  const { id = '' } = useParams();
  const { t, pick } = useI18n();
  const { items, ready } = useCatalog();
  const item = items.find((i) => i.id === id);
  const [fav, setFav] = useState(false);
  const [pack, setPack] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notified, setNotified] = useState(false);
  useEffect(() => { setFav(getFavs().includes(id)); setPack(hasPack(id)); setNotified(load<string[]>('cg:notify', []).includes(id)); }, [id]);

  if (!ready) return <div className="empty">{t('loading')}</div>;
  if (!item) return <div className="wrap"><div className="empty">{t('nf')}</div></div>;
  const soon = item.status === 'coming_soon';
  const pos = getPosition(id);
  const more = items.filter((i) => i.id !== id && i.status === item.status).slice(0, 4);

  const togglePack = async () => {
    setBusy(true);
    try { pack ? await removePack(id) : await savePack(id); setPack(!pack); } catch { /* offline or unsupported */ }
    setBusy(false);
  };
  const notify = () => { save('cg:notify', [...new Set([...load<string[]>('cg:notify', []), id])]); setNotified(true); };

  return (
    <div className="wrap">
      <div className="crumbs"><Link to="/library">{t('nav.library')}</Link> &nbsp;/&nbsp; {item.series ?? item.publisher}</div>
      <div className="detail">
        <div className="l"><Cover id={item.id} title={pick(item.title)} tag={soon ? 'COMIC' : 'KAHANI'} soon={soon ? t('soon').toUpperCase() : undefined} /></div>
        <div className="r">
          <div className="eyebrow">{item.series ?? item.publisher} · {soon ? t('f.comics') : t('f.kahani')}</div>
          <h1>{pick(item.title)}</h1>
          <p className="blurb">{pick(item.blurb)}</p>
          <div style={{ marginTop: 18, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span className={`pill ${soon ? 'lic' : 'ok'}`}>{RIGHTS_LABEL[item.rights]}</span>
            <span className="pill">{item.age}</span>
            {item.readMinutes && <span className="pill">{item.readMinutes} min</span>}
          </div>

          {soon ? (
            <>
              <p className="blurb">{t('title.soon.body')}</p>
              <div className="acts">
                <button className="pri dhak" type="button" onClick={notify} disabled={notified}>{notified ? t('title.notified') : t('title.notify')}</button>
                <Link to="/library" className="sec">{t('nav.library')}</Link>
              </div>
              <dl className="credit"><dt>{t('title.publisher')}</dt><dd>{item.publisher}</dd><dt>{t('title.license')}</dt><dd>{RIGHTS_LABEL[item.rights]} — see <Link to="/sources">Sources</Link> and the partnership email drafts in the project’s LICENSING folder.</dd></dl>
            </>
          ) : (
            <>
              <div className="acts">
                <Link to={`/read/${id}`} className="pri dhak">{pos ? `${t('continue')} · ${t('panel')} ${pos.index + 1}` : t('cta.read')}</Link>
                <Link to={`/listen/${id}`} className="sec dhak">{t('cta.listen')}</Link>
                <button className="sec dhak" type="button" aria-pressed={fav} onClick={() => setFav(toggleFav(id).includes(id))}><Bookmark />{fav ? t('title.faved') : t('title.fav')}</button>
                {offlineSupported() && <button className="sec dhak" type="button" onClick={togglePack} disabled={busy}>{pack ? `${t('title.offline.done')} (${formatBytes(packSize(id))})` : t('title.offline')}</button>}
              </div>

              <div className="sub-h"><h2 className="h2 sm">{t('title.langs')}</h2></div>
              {item.langs.map((l, n) => (
                <div className="lrow" key={l}>
                  <span className="n">{String(n + 1).padStart(2, '0')}</span>
                  <span className="t" lang={l}>{LANG_NAMES[l]}</span>
                  <span className="a"><Link to={`/read/${id}?lang=${l}`} className="lnk">{t('read')} →</Link><Link to={`/listen/${id}?lang=${l}`} className="lnk">{t('cta.listen')} →</Link></span>
                </div>
              ))}

              <div className="sub-h"><h2 className="h2 sm">{t('title.credits')}</h2></div>
              <dl className="credit">
                {item.credits?.map((c, n) => <div key={n}><dt>{c.role}</dt><dd>{c.author}{c.note ? ` — ${c.note}` : ''}</dd></div>)}
                <dt>{t('title.license')}</dt><dd>{item.license ? <a href={item.license.url} target="_blank" rel="noreferrer">{item.license.name}</a> : RIGHTS_LABEL[item.rights]}</dd>
                <dt>{t('title.source')}</dt><dd>{item.sourceUrl ? <a href={item.sourceUrl} target="_blank" rel="noreferrer">{item.sourceName ?? item.sourceUrl}</a> : item.sourceName}</dd>
                <dt>{t('title.verified')}</dt><dd>{item.verifiedOn}</dd>
              </dl>
              <p className="help"><Link to={`/takedown?title=${id}`} className="lnk">{t('title.takedown')}</Link></p>
            </>
          )}
        </div>
      </div>
      {more.length > 0 && (
        <section className="sect" style={{ paddingTop: 80 }}>
          <div className="sect-h"><h2 className="h2 sm">{t('title.more')}</h2></div>
          <div className="cover-grid">{more.map((i) => <CoverCard key={i.id} item={i} />)}</div>
        </section>
      )}
      <div style={{ height: 40 }} />
    </div>
  );
}
