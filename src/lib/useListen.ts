import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Lang, Story } from '../types';
import { AudioQueue, buildQueue, type QueueState } from './audio-queue';
import { BrowserEngine, hasVoice, speechSupported } from './speech';

export function useListen(story: Story | null, lang: Lang, initialAuto = true) {
  const [state, setState] = useState<QueueState>({ status: 'idle', panel: 0, lineId: null, sleepEndsAt: null });
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
    const q = new AudioQueue(buildQueue(story, lang), new BrowserEngine(), { autoAdvance: autoRef.current });
    q.setRate(rateRef.current);
    qRef.current = q;
    setState(q.state);
    const off = q.subscribe(setState);
    return () => { off(); q.dispose(); qRef.current = null; };
  }, [story, lang]);

  const setRate = useCallback((r: number) => { rateRef.current = r; setRateState(r); qRef.current?.setRate(r); }, []);
  const setAuto = useCallback((a: boolean) => { autoRef.current = a; setAutoState(a); qRef.current?.setAutoAdvance(a); }, []);
  const api = useMemo(() => ({
    play: () => qRef.current?.play(), pause: () => qRef.current?.pause(), toggle: () => qRef.current?.toggle(),
    next: () => qRef.current?.nextPanel(), prev: () => qRef.current?.prevPanel(),
    seekPanel: (p: number) => qRef.current?.seekPanel(p), setSleep: (m: number) => qRef.current?.setSleep(m),
  }), []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const voiceMissing = useMemo(() => speechSupported() && !hasVoice(lang) && lang !== undefined, [lang, voiceTick]);
  return { state, rate, setRate, auto, setAuto, supported: speechSupported(), voiceMissing, ...api };
}
