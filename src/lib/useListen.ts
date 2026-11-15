import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Lang, Story } from '../types';
import { AudioQueue, buildQueue, type QueueState } from './audio-queue';
import { BrowserEngine, speechSupported, voiceQuality } from './speech';

const GAPS = { line: 280, panel: 750 }; // natural pause after a line, longer breath between panels

export function useListen(story: Story | null, lang: Lang, initialAuto = true, meta?: { title?: string; artist?: string }) {
  const [state, setState] = useState<QueueState>({ status: 'idle', panel: 0, lineId: null, sleepEndsAt: null, source: null });
  const [rate, setRateState] = useState(1);
  const [auto, setAutoState] = useState(initialAuto);
  const [voiceTick, setVoiceTick] = useState(0);
  const qRef = useRef<AudioQueue | null>(null);
  const rateRef = useRef(1);
  const autoRef = useRef(initialAuto);

  useEffect(() => {
    if (!speechSupported()) return;
    const f = () => setVoiceTick((n) => n + 1);
    window.speechSynthesis.addEventListener?.('voiceschanged', f);
    return () => window.speechSynthesis.removeEventListener?.('voiceschanged', f);
  }, []);

  useEffect(() => {
    if (!story) return;
    const engine = new BrowserEngine();
    const q = new AudioQueue(buildQueue(story, lang), engine, { autoAdvance: autoRef.current, gapMs: GAPS });
    engine.onSource = (s) => setState((cur) => (cur.source === s ? cur : { ...cur, source: s })); // a failed file falls back to the device voice
    q.setRate(rateRef.current);
    qRef.current = q;
    setState(q.state);
    const off = q.subscribe(setState);
    return () => { off(); q.dispose(); qRef.current = null; };
  }, [story, lang]);

  // Lock-screen / headset controls and background play (Media Session API).
  useEffect(() => {
    const ms = typeof navigator !== 'undefined' ? navigator.mediaSession : undefined;
    if (!ms || !story) return;
    try {
      if (typeof MediaMetadata !== 'undefined') ms.metadata = new MediaMetadata({ title: meta?.title ?? story.id, artist: meta?.artist ?? 'Comic Gali' });
      ms.setActionHandler('play', () => qRef.current?.play());
      ms.setActionHandler('pause', () => qRef.current?.pause());
      ms.setActionHandler('nexttrack', () => qRef.current?.nextPanel());
      ms.setActionHandler('previoustrack', () => qRef.current?.prevPanel());
    } catch { /* unsupported action */ }
    return () => { try { (['play', 'pause', 'nexttrack', 'previoustrack'] as const).forEach((a) => ms.setActionHandler(a, null)); } catch { /* ignore */ } };
  }, [story, meta?.title, meta?.artist]);
  useEffect(() => { if (navigator.mediaSession) navigator.mediaSession.playbackState = state.status === 'playing' ? 'playing' : 'paused'; }, [state.status]);

  const setRate = useCallback((r: number) => { rateRef.current = r; setRateState(r); qRef.current?.setRate(r); }, []);
  const setAuto = useCallback((a: boolean) => { autoRef.current = a; setAutoState(a); qRef.current?.setAutoAdvance(a); }, []);
  const api = useMemo(() => ({
    play: () => qRef.current?.play(), pause: () => qRef.current?.pause(), toggle: () => qRef.current?.toggle(),
    next: () => qRef.current?.nextPanel(), prev: () => qRef.current?.prevPanel(),
    seekPanel: (p: number) => qRef.current?.seekPanel(p), setSleep: (m: number) => qRef.current?.setSleep(m),
  }), []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const quality = useMemo(() => (speechSupported() ? voiceQuality(lang) : 'none'), [lang, voiceTick]);
  const hasFiles = useMemo(() => !!story && buildQueue(story, lang).some((i) => i.audioUrl), [story, lang]);
  return { state, rate, setRate, auto, setAuto, supported: speechSupported(), voiceMissing: speechSupported() && quality === 'none' && !hasFiles, voiceQuality: quality, hasFiles, ...api };
}
