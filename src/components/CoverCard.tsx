import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { CatalogItem } from '../types';
import { useI18n } from '../lib/i18n';
import { getFavs, toggleFav } from '../lib/storage';
import { Cover } from './Cover';
import { Heart } from './Icons';

export function CoverCard({ item }: { item: CatalogItem }) {
  const { t, pick } = useI18n();
  const [favs, setFavs] = useState(getFavs());
  const soon = item.status === 'coming_soon';
  const on = favs.includes(item.id);
  return (
    <div className="cover">
      <Link to={`/title/${item.id}`} className="dhak" style={{ display: 'block' }}>
        <Cover id={item.id} title={pick(item.title)} tag={soon ? 'COMIC' : 'KAHANI'} image={item.coverImage} soon={soon ? t('soon').toUpperCase() : undefined} />
        <div className="sub">{soon ? (item.publisher ?? t('soon')) : t('readlisten')}</div>
      </Link>
      {!soon && (
        <button type="button" className="fav" aria-pressed={on} aria-label={`${on ? t('title.faved') : t('title.fav')}: ${pick(item.title)}`} onClick={() => setFavs(toggleFav(item.id))}><Heart /></button>
      )}
    </div>
  );
}
