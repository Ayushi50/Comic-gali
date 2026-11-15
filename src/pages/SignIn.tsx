import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Controls, Logo } from '../components/Layout';
import { Cover } from '../components/Cover';
import { useI18n } from '../lib/i18n';
import { load, save } from '../lib/storage';

/** Local-only profile: there is no auth backend yet, so this only remembers a display name on this device. */
export function SignIn() {
  const { t } = useI18n();
  const nav = useNavigate();
  const [name, setName] = useState(load<string | null>('cg:user', '') ?? '');
  const submit = (e: FormEvent) => { e.preventDefault(); save('cg:user', name.trim() || null); nav('/library'); };
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
        <form onSubmit={submit}>
          <div><h1 className="h2 sm">{t('si.h')}</h1><p className="muted" style={{ margin: '8px 0 0' }}>{t('si.sub')}</p></div>
          <div><label className="lbl" htmlFor="nm">{t('si.name')}</label><input id="nm" className="inp" value={name} onChange={(e) => setName(e.target.value)} autoComplete="given-name" maxLength={30} /></div>
          <button className="pri dhak" type="submit">{t('si.go')}</button>
          <p className="help">{t('si.note')}</p>
        </form>
      </div>
    </div>
  );
}
