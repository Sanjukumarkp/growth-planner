import { sql } from '@/lib/db';
import { token, sha256 } from '@/lib/crypto';
import { body, clean, json } from '@/lib/http';
import { appUrl, emailConfigured, layout, sendEmail } from '@/lib/email';
import { open } from '@/lib/route';

export const POST = open(async (req) => {
  const b = await body<{ email?: string }>(req);
  const email = clean(b?.email, 254).toLowerCase();
  const [u] = await sql`select id from users where email = ${email}`;
  let devLink: string | undefined;
  if (u) {
    const t = token();
    await sql`insert into password_resets (token_hash, user_id, expires_at) values (${sha256(t)}, ${u.id}, now() + interval '1 hour')`;
    const link = `${appUrl()}/reset/${t}`;
    const m = layout('Reset your password', ['Someone asked to reset the password for your Growth Planner account.', 'The link works for one hour. If this wasn’t you, ignore this email.'], { label: 'Choose a new password', url: link });
    await sendEmail(email, 'Reset your Growth Planner password', m.html, m.text);
    if (!emailConfigured() && process.env.NODE_ENV !== 'production') devLink = link;
  }
  // Same answer whether or not the account exists.
  return json({ ok: true, emailConfigured: emailConfigured(), devLink });
});
