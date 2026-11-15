import { useEffect } from 'react';
import { useI18n } from '../lib/i18n';
import { Pause, Play, Skip, SkipBack } from './Icons';

/** Big-button, low-distraction listening view for use on the road. Requests a screen wake lock where supported. */
export function Driving({ who, text, playing, onToggle, onPrev, onNext, onClose, progress }: {
  who?: string; text: string; playing: boolean; progress: string;
  onToggle: () => void; onPrev: () => void; onNext: () => void; onClose: () => void;
}) {
  const { t } = useI18n();
  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null;
    (navigator as unknown as { wakeLock?: { request: (t: string) => Promise<typeof lock> } }).wakeLock?.request('screen').then((l) => { lock = l; }).catch(() => {});
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', k);
    return () => { window.removeEventListener('keydown', k); void lock?.release(); };
  }, [onClose]);
  return (
    <div className="drive" role="dialog" aria-modal="true" aria-label={t('ls.drive')}>
      <button type="button" className="exit" onClick={onClose}>{t('ls.exit')}</button>
      <div className="txt" aria-live="polite">{who && <span className="who">{who}</span>}{text}</div>
      <div className="ctl">
        <button type="button" onClick={onPrev} aria-label={t('rd.prev')}><SkipBack /></button>
        <button type="button" className="main" onClick={onToggle} aria-label={playing ? t('ls.pause') : t('ls.play')}>{playing ? <Pause s={52} /> : <Play s={52} />}</button>
        <button type="button" onClick={onNext} aria-label={t('rd.next')}><Skip /></button>
      </div>
      <div style={{ textAlign: 'center', fontSize: 15, opacity: .8 }}>{progress}</div>
    </div>
  );
}
