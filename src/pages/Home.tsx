import { Link } from 'react-router-dom';
import { Cover } from '../components/Cover';
import { CoverCard } from '../components/CoverCard';
import { Pause, Play } from '../components/Icons';
import { useCatalog } from '../lib/data';
import { useI18n } from '../lib/i18n';
import { useState } from 'react';
import { recentPositions } from '../lib/storage';

export function Home() {
  const { t, pick } = useI18n();
  const { items } = useCatalog();
  const [playing, setPlaying] = useState(false);
  const avail = items.filter((i) => i.status === 'available');
  const soon = items.filter((i) => i.status === 'coming_soon');
  const feature = avail[0];
  const last = recentPositions()[0];
  const lastItem = last && items.find((i) => i.id === last.id);

  return (
    <div className={playing ? 'is-playing' : ''}>
      <section className="wrap hero" id="top">
        <div style={{ flex: '1 1 500px', minWidth: 0 }}>
          <div className="eyebrow">{t('hero.eyebrow')}</div>
          <h1>{t('hero.l1')}<br /><em>{t('hero.l2')}</em></h1>
          <p>{t('hero.sub')}</p>
          <div className="acts">
            <Link to={`/read/${lastItem?.id ?? feature?.id ?? 'monkey-crocodile'}`} className="pri dhak">{lastItem ? t('continue') : t('cta.read')}</Link>
            <Link to={`/listen/${feature?.id ?? 'monkey-crocodile'}`} className="lnk"><Play s={16} />{t('cta.listen')}</Link>
          </div>
          {lastItem && last && (
            <Link to={`/read/${lastItem.id}`} className="ticket" aria-label={`${t('lib.continue')}: ${pick(lastItem.title)}`} style={{ maxWidth: 520 }}>
              <div className="tc"><div style={{ width: 52 }}><Cover id={lastItem.id} title="" tag="" /></div></div>
              <div className="tb"><div className="eyebrow" style={{ fontSize: 11 }}>{t('lib.continue')}</div>
                <div className="serif" style={{ fontWeight: 600, fontSize: 22, marginTop: 4 }}>{pick(lastItem.title)}</div>
                <div className="tiny">{t('panel')} {last.pos.index + 1}</div></div>
              <div className="go">→</div>
            </Link>
          )}
        </div>
        <div style={{ flex: '1 1 420px', display: 'flex', justifyContent: 'center' }}>
          <div className="fan">
            {avail[1] && <div className="fc fl"><Cover id={avail[1].id} title={pick(avail[1].title)} variant={0} /></div>}
            {avail[2] && <div className="fc fr"><Cover id={avail[2].id} title={pick(avail[2].title)} variant={4} /></div>}
            {avail[0] && <div className="fc fm"><Cover id={avail[0].id} title={pick(avail[0].title)} variant={1} /></div>}
            <div className="bubble">Aur phir…
              <svg width="30" height="26" viewBox="0 0 30 26" aria-hidden="true"><path d="M0 0H30L4 26Z" style={{ fill: 'var(--paper)' }} /><path d="M1 4L4 24L27 4" fill="none" style={{ stroke: 'var(--ink)' }} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" /></svg>
            </div>
          </div>
        </div>
      </section>

      <section className="wrap sect" id="shelf">
        <div className="sect-h"><h2 className="h2">{t('home.today')}</h2><Link to="/library" className="lnk">{t('home.all')}</Link></div>
        <div className="cover-grid">{avail.map((i) => <CoverCard key={i.id} item={i} />)}</div>
      </section>

      <section className="wrap duo">
        <Link to={`/read/${feature?.id ?? ''}`} className="pn dhak">
          <div><div className="big">{t('read')}</div><div className="it">{t('home.padho.sub')}</div></div>
          <span className="lnk ul">{t('home.open')}</span>
          <svg className="art-r" viewBox="0 0 240 300" aria-hidden="true" style={{ right: 36, bottom: -40, width: 'min(40%,230px)', transform: 'rotate(6deg)' }}>
            <rect x="1" y="1" width="238" height="298" rx="6" style={{ fill: 'var(--paper)', stroke: 'var(--ink)' }} strokeWidth="2" />
            <rect x="16" y="16" width="208" height="86" rx="3" style={{ fill: 'var(--c1)' }} /><rect x="16" y="112" width="98" height="82" rx="3" style={{ fill: 'var(--c2)' }} />
            <rect x="126" y="112" width="98" height="82" rx="3" style={{ fill: 'var(--c4)' }} /><rect x="16" y="204" width="208" height="80" rx="3" style={{ fill: 'var(--c3)' }} />
            <rect x="30" y="30" width="84" height="30" rx="15" style={{ fill: 'var(--paper)' }} />
            <g style={{ fill: 'var(--ink)' }}><circle cx="58" cy="45" r="3" /><circle cx="72" cy="45" r="3" /><circle cx="86" cy="45" r="3" /></g>
            <circle cx="178" cy="58" r="20" style={{ fill: 'var(--on1)' }} opacity=".9" />
          </svg>
        </Link>
        <div className="pn suno" id="suno">
          <div className="big">{t('nav.suno')}</div>
          <svg className="art-r" viewBox="0 0 320 200" aria-hidden="true" style={{ right: 32, top: 52, width: 'min(50%,310px)', transform: 'rotate(-5deg)' }}>
            <rect x="3" y="3" width="314" height="194" rx="14" style={{ fill: 'var(--paper)', stroke: 'var(--ink)' }} strokeWidth="2" />
            <rect x="26" y="22" width="268" height="112" rx="6" style={{ fill: 'var(--c4)' }} />
            <text x="42" y="50" style={{ fill: 'var(--ink)', fontFamily: 'Inter,system-ui,sans-serif', fontWeight: 600, fontSize: 13, letterSpacing: '.14em' }}>KAHANI TAPE · SIDE A</text>
            <rect x="80" y="64" width="160" height="54" rx="27" style={{ fill: 'var(--ink)' }} />
            {[112, 208].map((cx) => (
              <g className="reel" key={cx}><circle cx={cx} cy="91" r="17" style={{ fill: 'var(--paper)' }} /><path d={`M${cx} 76v10M${cx - 13} 98l9-5M${cx + 13} 98l-9-5`} style={{ stroke: 'var(--ink)' }} strokeWidth="3.5" strokeLinecap="round" /><circle cx={cx} cy="91" r="4" style={{ fill: 'var(--c1)' }} /></g>
            ))}
            <path d="M86 196L102 154H218L234 196" fill="none" style={{ stroke: 'var(--ink)' }} strokeWidth="2" strokeLinejoin="round" />
          </svg>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 18 }}>
            <button className="playbtn dhak" type="button" aria-pressed={playing} aria-label={playing ? t('ls.pause') : t('ls.play')} onClick={() => setPlaying((p) => !p)}>{playing ? <Pause /> : <Play />}</button>
            <Link to={`/listen/${feature?.id ?? ''}`} style={{ display: 'block' }}>
              <div style={{ fontWeight: 600, fontSize: 20, lineHeight: 1.3 }}>{feature && pick(feature.title)}</div>
              <div className="serif" style={{ fontStyle: 'italic', fontSize: 19 }}>{feature?.series}</div>
            </Link>
          </div>
        </div>
      </section>

      <section className="wrap sect" id="kahani">
        <h2 className="h2 sm" style={{ paddingBottom: 16, borderBottom: '1.5px solid var(--fg)' }}>{t('home.kahaniyan')}</h2>
        {avail.map((i, n) => (
          <Link key={i.id} to={`/title/${i.id}`} className="rowl">
            <span className="n">{String(n + 1).padStart(2, '0')}</span>
            <span className="t">{pick(i.title)}</span>
            <span className="d">{i.series} · {i.langs.length} {i.langs.length === 1 ? 'bhasha' : 'bhashayein'}</span>
            <span style={{ fontSize: 24 }}>→</span>
          </Link>
        ))}
      </section>

      <section className="wrap sect">
        <div className="sect-h"><div><h2 className="h2">{t('home.soon')}</h2><div className="muted" style={{ marginTop: 8 }}>{t('home.soon.sub')}</div></div><Link to="/library?f=comics" className="lnk">{t('home.all')}</Link></div>
        <div className="cover-grid">{soon.slice(0, 6).map((i) => <CoverCard key={i.id} item={i} />)}</div>
      </section>

      <section className="wrap sect">
        <div className="band">
          <div style={{ flex: '1 1 520px', minWidth: 0, maxWidth: 720 }}>
            <div className="q">{t('home.quote')}
              <svg width="44" height="36" viewBox="0 0 44 36" aria-hidden="true"><path d="M0 0H44L8 36Z" style={{ fill: 'var(--paper)' }} /></svg>
            </div>
            <div style={{ margin: '46px 0 0 56px', fontWeight: 500, fontSize: 17 }}>{t('home.quote.by')}</div>
          </div>
          <div style={{ flex: '0 1 320px', display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div className="serif" style={{ fontWeight: 600, fontSize: 'clamp(28px,3vw,40px)', lineHeight: 1.12 }}>{t('home.which')}</div>
            <Link to={`/read/${feature?.id ?? ''}`} className="pri paper dhak" style={{ alignSelf: 'flex-start' }}>{t('cta.read')}</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
