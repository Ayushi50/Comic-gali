import { useEffect, useRef } from 'react';

declare global { interface Window { turnstile?: { render(el: HTMLElement, o: { sitekey: string; callback: (t: string) => void; 'expired-callback'?: () => void }): string; remove(id: string): void } } }
/** Cloudflare Turnstile (free anti-spam). Renders nothing when no site key is configured. */
export function Turnstile({ siteKey, onToken }: { siteKey: string | null | undefined; onToken: (t: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!siteKey || !ref.current) return;
    let id: string | undefined; let cancelled = false;
    const mount = () => { if (!cancelled && ref.current && window.turnstile) id = window.turnstile.render(ref.current, { sitekey: siteKey, callback: onToken, 'expired-callback': () => onToken('') }); };
    if (window.turnstile) mount();
    else {
      let s = document.querySelector<HTMLScriptElement>('script[data-turnstile]');
      if (!s) { s = document.createElement('script'); s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'; s.async = true; s.dataset.turnstile = '1'; document.head.appendChild(s); }
      s.addEventListener('load', mount);
    }
    return () => { cancelled = true; if (id && window.turnstile) window.turnstile.remove(id); };
  }, [siteKey, onToken]);
  return siteKey ? <div ref={ref} /> : null;
}
