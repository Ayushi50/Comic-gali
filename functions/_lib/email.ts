import type { Env } from './db';
import { escapeHtml } from './validate';

export interface Mail { to: string; subject: string; text: string; }
export type Sender = (env: Env, m: Mail) => Promise<boolean>;

/** Resend REST API (free: 100/day, 3000/month; see DECISIONS.md). No key configured = log only, never throws. */
export const sendMail: Sender = async (env, m) => {
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM) { console.log('[mail:skipped]', m.subject); return false; }
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST', headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({ from: env.EMAIL_FROM, to: [m.to], subject: m.subject, text: m.text, html: `<pre style="font:15px/1.5 system-ui;white-space:pre-wrap">${escapeHtml(m.text)}</pre>` }),
    });
    return r.ok;
  } catch { return false; }
};
export const tpl = {
  received: (title: string) => ({ subject: 'We received your submission', text: `Thanks! "${title}" is in our review queue. A person checks every submission; we will email you when it is approved or if we need changes.\n\n— Comic Gali` }),
  approved: (title: string, url: string) => ({ subject: 'Your story is live on Comic Gali', text: `Good news: "${title}" was approved and is now published.\n${url}\n\n— Comic Gali` }),
  rejected: (title: string, reason: string) => ({ subject: 'About your Comic Gali submission', text: `We could not publish "${title}" this time.\n\nReason: ${reason}\n\nYou are welcome to fix this and submit again.\n\n— Comic Gali` }),
  takedownOwner: (id: string, title: string, name: string, email: string, reason: string) => ({ subject: `Takedown request ${id.slice(0, 8)}`, text: `Title: ${title}\nFrom: ${name} <${email}>\n\n${reason}\n\nModerators can unpublish from /moderation.` }),
  takedownAck: () => ({ subject: 'We received your takedown request', text: 'We have received your request and will review it promptly. If the title is clearly infringing a moderator can unpublish it immediately.\n\n— Comic Gali' }),
  magic: (url: string) => ({ subject: 'Your Comic Gali sign-in link', text: `Open this link to sign in (valid 15 minutes, one use):\n${url}\n\nIf you did not ask for it, ignore this email.` }),
};
