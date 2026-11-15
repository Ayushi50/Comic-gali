import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { LANG_NAMES, useI18n } from '../lib/i18n';
import { addSubmission, fileToDataUrl } from '../lib/submissions';
import { LANGS } from '../types';

const LICENSES = [
  ['CC BY 4.0', 'CC BY 4.0 — share with credit'], ['CC BY-SA 4.0', 'CC BY-SA 4.0 — share alike'], ['CC0', 'CC0 — public domain dedication'],
  ['Permission to host', 'All rights reserved — I give Comic Gali permission to host and display this work'],
];

export default function Submit() {
  const { t } = useI18n();
  const [f, setF] = useState({ title: '', creator: '', email: '', lang: 'en', license: 'CC BY 4.0', panelText: '', consent: false });
  const [files, setFiles] = useState<File[]>([]);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setErr('');
    if (!files.length) { setErr('Add at least one page image.'); return; }
    if (files.some((x) => !x.type.startsWith('image/') || x.size > 6e6)) { setErr('Pages must be images under 6 MB each.'); return; }
    try {
      const pages = await Promise.all(files.map(fileToDataUrl));
      await addSubmission({ id: crypto.randomUUID(), ...f, pages, status: 'pending', at: Date.now() });
      setDone(true);
    } catch { setErr('Could not save the submission in this browser.'); }
  };
  if (done) return <div className="wrap"><div className="empty">Thank you — your work is in the moderation queue. <Link to="/moderation" className="lnk ul">See the queue</Link></div></div>;
  return (
    <div className="wrap" style={{ paddingBottom: 60 }}>
      <div className="page-h"><h1>{t('sub.h')}</h1></div>
      <p className="muted" style={{ maxWidth: 640, fontSize: 18, lineHeight: 1.6 }}>Indie artist or writer? Add your comic or illustrated story. A person checks every submission before it appears on the shelf, and your credit and licence are shown on its page.</p>
      <form onSubmit={submit} className="panelbox" style={{ display: 'grid', gap: 18, maxWidth: 720, marginTop: 24 }}>
        <div className="grid2">
          <div><label className="lbl" htmlFor="s1">Title</label><input id="s1" className="inp" required value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
          <div><label className="lbl" htmlFor="s2">Creator name</label><input id="s2" className="inp" required value={f.creator} onChange={(e) => setF({ ...f, creator: e.target.value })} /></div>
          <div><label className="lbl" htmlFor="s3">Email (not shown publicly)</label><input id="s3" className="inp" type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
          <div><label className="lbl" htmlFor="s4">Language</label><select id="s4" className="inp" value={f.lang} onChange={(e) => setF({ ...f, lang: e.target.value })}>{LANGS.map((l) => <option key={l} value={l}>{LANG_NAMES[l]}</option>)}</select></div>
        </div>
        <div><label className="lbl" htmlFor="s5">Pages (images, in order)</label><input id="s5" className="inp" style={{ paddingTop: 14 }} type="file" accept="image/*" multiple onChange={(e) => setFiles([...(e.target.files ?? [])])} /><div className="help">{files.length} file(s) chosen. Up to 6 MB each.</div></div>
        <div><label className="lbl" htmlFor="s6">Panel text (optional, makes it listenable)</label><textarea id="s6" className="inp" value={f.panelText} onChange={(e) => setF({ ...f, panelText: e.target.value })} placeholder={'Page 1, panel 1\nNarrator: One evening in the lane…\nRiya: Let’s fly kites!'} /><div className="help">One line per balloon as “Speaker: text”. Leave a blank line between panels.</div></div>
        <div><label className="lbl" htmlFor="s7">Licence</label><select id="s7" className="inp" value={f.license} onChange={(e) => setF({ ...f, license: e.target.value })}>{LICENSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
        <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}><input type="checkbox" required checked={f.consent} onChange={(e) => setF({ ...f, consent: e.target.checked })} style={{ marginTop: 4 }} /><span>I created this work (or hold the rights to it), I choose the licence above, and I agree that Comic Gali may display it and read it aloud with text-to-speech.</span></label>
        {err && <div role="alert" style={{ color: 'var(--c2)', fontWeight: 600 }}>{err}</div>}
        <div><button className="pri dhak" type="submit">Send for review</button></div>
      </form>
    </div>
  );
}
