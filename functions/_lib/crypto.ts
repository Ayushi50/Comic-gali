const enc = new TextEncoder();
const b64u = (b: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
export const randomToken = (bytes = 32) => b64u(crypto.getRandomValues(new Uint8Array(bytes)));
export async function sha256(s: string): Promise<string> {
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(s)))].map((x) => x.toString(16).padStart(2, '0')).join('');
}
async function key(secret: string) { return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']); }
export async function hmac(secret: string, msg: string) { return b64u(await crypto.subtle.sign('HMAC', await key(secret), enc.encode(msg))); }
export function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
/** value.signature, so a cookie cannot be forged without SESSION_SECRET. */
export async function sign(secret: string, value: string) { return `${value}.${await hmac(secret, value)}`; }
export async function unsign(secret: string, signed: string): Promise<string | null> {
  const i = signed.lastIndexOf('.'); if (i < 1) return null;
  const v = signed.slice(0, i);
  return safeEqual(signed.slice(i + 1), await hmac(secret, v)) ? v : null;
}
/** Short-lived signed URL for private objects (moderator previews). */
export async function signUrl(secret: string, path: string, ttlSec = 600, nowMs = Date.now()) {
  const exp = Math.floor(nowMs / 1000) + ttlSec;
  return `${path}?exp=${exp}&sig=${await hmac(secret, `${path}|${exp}`)}`;
}
export async function verifyUrl(secret: string, path: string, exp: string | null, sig: string | null, nowMs = Date.now()) {
  if (!exp || !sig || Number(exp) < Math.floor(nowMs / 1000)) return false;
  return safeEqual(sig, await hmac(secret, `${path}|${exp}`));
}
