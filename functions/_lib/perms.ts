export type Role = 'reader' | 'creator' | 'moderator' | 'admin';
export type Action =
  | 'submission.create' | 'submission.list' | 'submission.preview' | 'submission.review'
  | 'title.unpublish' | 'takedown.list' | 'takedown.handle' | 'recording.upload' | 'audit.read' | 'role.set';

const RANK: Record<Role, number> = { reader: 0, creator: 1, moderator: 2, admin: 3 };
const MIN: Record<Action, Role | 'anon'> = {
  'submission.create': 'anon',      // anyone may submit (Turnstile + rate limit); a session just links it to the account
  'submission.list': 'moderator', 'submission.preview': 'moderator', 'submission.review': 'moderator',
  'title.unpublish': 'moderator', 'takedown.list': 'moderator', 'takedown.handle': 'moderator',
  'recording.upload': 'creator',    // creators may upload for their own titles (checked separately); moderators for any
  'audit.read': 'admin', 'role.set': 'admin',
};
export function can(role: Role | null | undefined, action: Action): boolean {
  const need = MIN[action];
  if (need === 'anon') return true;
  return !!role && RANK[role] >= RANK[need];
}
export const isRole = (x: unknown): x is Role => typeof x === 'string' && x in RANK;
/** Role given at account creation or login: the ADMIN_EMAIL account is always admin. */
export function roleFor(email: string, current: Role | undefined, adminEmail?: string): Role {
  if (adminEmail && email.trim().toLowerCase() === adminEmail.trim().toLowerCase()) return 'admin';
  return current ?? 'reader';
}
