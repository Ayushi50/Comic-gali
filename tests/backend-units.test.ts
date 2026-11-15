import { describe, expect, it } from 'vitest';
import { can, roleFor } from '../functions/_lib/perms';
import { clean, escapeHtml, isEmail, sniffAudio, sniffImage, validatePages, validateSubmissionFields, LIMITS } from '../functions/_lib/validate';
import { sign, unsign, signUrl, verifyUrl } from '../functions/_lib/crypto';
import { parsePanelText } from '../functions/_lib/content';

const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);

describe('permissions', () => {
  it('only moderators and admins may review; readers and anons may not', () => {
    for (const a of ['submission.review', 'submission.list', 'submission.preview', 'title.unpublish', 'takedown.handle'] as const) {
      expect(can(null, a)).toBe(false); expect(can('reader', a)).toBe(false); expect(can('creator', a)).toBe(false);
      expect(can('moderator', a)).toBe(true); expect(can('admin', a)).toBe(true);
    }
  });
  it('audit and role changes are admin-only; anyone can submit', () => {
    expect(can('moderator', 'audit.read')).toBe(false); expect(can('admin', 'role.set')).toBe(true);
    expect(can(null, 'submission.create')).toBe(true);
  });
  it('ADMIN_EMAIL account is admin, case-insensitively', () => {
    expect(roleFor('Boss@x.com', 'reader', 'boss@X.com')).toBe('admin');
    expect(roleFor('a@x.com', undefined, 'boss@x.com')).toBe('reader');
    expect(roleFor('a@x.com', 'moderator', undefined)).toBe('moderator');
  });
});

describe('validators', () => {
  it('detects images by magic bytes, not by name or type', () => {
    expect(sniffImage(png)?.mime).toBe('image/png');
    expect(sniffImage(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))?.mime).toBe('image/jpeg');
    expect(sniffImage(new TextEncoder().encode('<svg onload=alert(1)>'))).toBeNull();
    expect(sniffImage(new TextEncoder().encode('GIF89a......'))).toBeNull();
  });
  it('detects audio', () => {
    expect(sniffAudio(new TextEncoder().encode('OggS\0\0\0\0'))?.mime).toBe('audio/ogg');
    expect(sniffAudio(new Uint8Array([0xff, 0xfb, 0x90, 0]))?.mime).toBe('audio/mpeg');
    expect(sniffAudio(png)).toBeNull();
  });
  it('enforces page count and size caps', () => {
    expect(validatePages([]).ok).toBe(false);
    expect(validatePages(Array(LIMITS.maxPages + 1).fill({ size: 10, bytes: png })).ok).toBe(false);
    const big = validatePages([{ size: LIMITS.maxPageBytes + 1, bytes: png }]); expect(big.ok).toBe(false);
    expect(validatePages([{ size: 10, bytes: new TextEncoder().encode('MZ......') }]).ok).toBe(false);
    expect(validatePages([{ size: 10, bytes: png }]).ok).toBe(true);
  });
  it('sanitises text and escapes html', () => {
    expect(clean('  <b>Hi</b>\u0000 there  ', 50)).toBe('bHi/b there');
    expect(clean('x'.repeat(500), 10)).toHaveLength(10);
    expect(escapeHtml('<a href="x">&')).toBe('&lt;a href=&quot;x&quot;&gt;&amp;');
    expect(isEmail('a@b.co')).toBe(true); expect(isEmail('a@b')).toBe(false); expect(isEmail('a b@c.com')).toBe(false);
  });
  it('validates submission fields', () => {
    const ok = { title: 'T', creator: 'C', email: 'a@b.co', lang: 'hi', license: 'CC BY 4.0', consent: 'true' };
    expect(validateSubmissionFields(ok).ok).toBe(true);
    expect(validateSubmissionFields({ ...ok, consent: 'false' }).ok).toBe(false);
    expect(validateSubmissionFields({ ...ok, license: 'All yours' }).ok).toBe(false);
    expect(validateSubmissionFields({ ...ok, lang: 'xx' }).ok).toBe(false);
    expect(validateSubmissionFields({ ...ok, email: 'nope' }).ok).toBe(false);
  });
});

describe('signing', () => {
  const secret = 's'.repeat(32);
  it('rejects tampered cookies', async () => {
    const c = await sign(secret, 'abc');
    expect(await unsign(secret, c)).toBe('abc'); expect(await unsign(secret, 'abd' + c.slice(3))).toBeNull(); expect(await unsign('other'.repeat(8), c)).toBeNull();
  });
  it('signed URLs expire and cannot be reused for other paths', async () => {
    const u = new URL('http://x' + (await signUrl(secret, '/api/media/sub/1/1.png', 60, 1_000_000)));
    const q = u.searchParams;
    expect(await verifyUrl(secret, u.pathname, q.get('exp'), q.get('sig'), 1_000_000)).toBe(true);
    expect(await verifyUrl(secret, u.pathname, q.get('exp'), q.get('sig'), 1_000_000 + 61_000)).toBe(false);
    expect(await verifyUrl(secret, '/api/media/sub/2/1.png', q.get('exp'), q.get('sig'), 1_000_000)).toBe(false);
  });
});

describe('panel text parsing', () => {
  it('makes narration and speech lines, one panel per block', () => {
    const { panels, characters } = parsePanelText('Page 1\nNarrator: Evening.\nRiya: Let us fly kites!\n\nThe kite soared.', 'en');
    expect(panels).toHaveLength(2);
    expect(panels[0].lines.map((l) => l.kind)).toEqual(['narration', 'speech']);
    expect(Object.keys(characters)).toEqual(['riya']);
    expect(panels[1].lines[0].kind).toBe('narration');
  });
});
