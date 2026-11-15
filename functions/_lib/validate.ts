import type { Lang } from '../../src/types';
export const LANG_CODES = ['en', 'hi', 'ta', 'te', 'bn', 'mr', 'gu', 'kn', 'ml', 'pa'] as const;
export const LICENSES = ['CC BY 4.0', 'CC BY-SA 4.0', 'CC0', 'Permission to host'] as const;
export const LIMITS = { maxPages: 12, maxPageBytes: 1_400_000, maxTotalBytes: 16_000_000, title: 120, name: 80, panelText: 8000, reason: 1000, recordingBytes: 1_400_000 };

/** Strip control characters and angle brackets, collapse whitespace, cap length. Output is text, never HTML. */
export function clean(s: unknown, max: number, multiline = false): string {
  let t = String(s ?? '').normalize('NFC').replace(multiline ? /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g : /[\u0000-\u001F\u007F]/g, ' ');
  t = t.replace(/[<>]/g, '');
  t = multiline ? t.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n') : t.replace(/\s+/g, ' ');
  return t.trim().slice(0, max);
}
export const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
export const isEmail = (s: string) => s.length <= 254 && /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']{2,}$/.test(s);
export const slugify = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'story';

export type ImageKind = { mime: string; ext: string };
/** Identify an image from its first bytes; the browser-supplied type is never trusted. */
export function sniffImage(b: Uint8Array): ImageKind | null {
  if (b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return { mime: 'image/png', ext: 'png' };
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { mime: 'image/jpeg', ext: 'jpg' };
  if (b.length > 12 && String.fromCharCode(...b.slice(0, 4)) === 'RIFF' && String.fromCharCode(...b.slice(8, 12)) === 'WEBP') return { mime: 'image/webp', ext: 'webp' };
  return null;
}
export function sniffAudio(b: Uint8Array): ImageKind | null {
  const s4 = String.fromCharCode(...b.slice(0, 4));
  if (s4 === 'OggS') return { mime: 'audio/ogg', ext: 'ogg' };
  if (s4 === 'ID3\u0003' || s4.startsWith('ID3') || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0)) return { mime: 'audio/mpeg', ext: 'mp3' };
  if (b.length > 12 && String.fromCharCode(...b.slice(4, 8)) === 'ftyp') return { mime: 'audio/mp4', ext: 'm4a' };
  if (s4 === '\x1aE\xdf\xa3') return { mime: 'audio/webm', ext: 'webm' };
  return null;
}

export interface SubmissionInput { title: string; creator: string; email: string; lang: Lang; license: string; panelText: string; consent: boolean; consentText: string; }
export function validateSubmissionFields(f: Record<string, unknown>): { ok: true; v: SubmissionInput } | { ok: false; error: string } {
  const title = clean(f.title, LIMITS.title), creator = clean(f.creator, LIMITS.name), email = clean(f.email, 254).toLowerCase();
  if (!title) return { ok: false, error: 'Title is required.' };
  if (!creator) return { ok: false, error: 'Creator name is required.' };
  if (!isEmail(email)) return { ok: false, error: 'A valid email is required.' };
  const lang = String(f.lang ?? 'en') as Lang;
  if (!(LANG_CODES as readonly string[]).includes(lang)) return { ok: false, error: 'Unknown language.' };
  const license = String(f.license ?? '');
  if (!(LICENSES as readonly string[]).includes(license)) return { ok: false, error: 'Choose one of the listed licences.' };
  if (String(f.consent) !== 'true' && f.consent !== true) return { ok: false, error: 'You must accept the consent statement.' };
  return { ok: true, v: { title, creator, email, lang, license, panelText: clean(f.panelText, LIMITS.panelText, true), consent: true, consentText: clean(f.consentText, 600) } };
}
export function validatePages(files: { size: number; bytes: Uint8Array }[]): { ok: true; kinds: ImageKind[] } | { ok: false; error: string; status: number } {
  if (!files.length) return { ok: false, error: 'Add at least one page image.', status: 400 };
  if (files.length > LIMITS.maxPages) return { ok: false, error: `At most ${LIMITS.maxPages} pages.`, status: 400 };
  let total = 0; const kinds: ImageKind[] = [];
  for (const [i, f] of files.entries()) {
    if (f.size > LIMITS.maxPageBytes) return { ok: false, error: `Page ${i + 1} is over ${(LIMITS.maxPageBytes / 1e6).toFixed(1)} MB.`, status: 413 };
    total += f.size;
    const k = sniffImage(f.bytes);
    if (!k) return { ok: false, error: `Page ${i + 1} is not a PNG, JPEG or WebP image.`, status: 415 };
    kinds.push(k);
  }
  if (total > LIMITS.maxTotalBytes) return { ok: false, error: 'Total upload is too large.', status: 413 };
  return { ok: true, kinds };
}
