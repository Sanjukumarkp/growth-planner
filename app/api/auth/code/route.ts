import { randomInt } from 'node:crypto';
import { sql } from '@/lib/db';
import { sha256 } from '@/lib/crypto';
import { body, clean, emailOk, fail, json } from '@/lib/http';
import { emailConfigured, layout, sendEmail } from '@/lib/email';
import { createUser, signInUser } from '@/lib/signin';
import { open } from '@/lib/route';

const hash = (email: string, code: string) => sha256(`${email}:${code}`);

/** step "send": email a 6-digit code. step "verify": check it and sign in (creating the account if new). */
export const POST = open(async (req) => {
  const b = await body<{ step?: string; email?: string; code?: string; name?: string; terms?: boolean }>(req);
  const email = clean(b?.email, 254).toLowerCase();
  if (!emailOk(email)) return fail('Enter a valid email address.');

  if (b?.step === 'send') {
    const [{ n }] = await sql`select count(*)::int as n from login_codes where email = ${email} and created_at > now() - interval '1 hour'`;
    if (n >= 5) return fail('Too many codes requested. Wait an hour or sign in another way.', 429);
    if (!emailConfigured() && process.env.NODE_ENV === 'production') return fail('Email codes aren’t set up on this server yet. Sign in with Google or a password.', 503);
    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    await sql`insert into login_codes (email, code_hash, expires_at) values (${email}, ${hash(email, code)}, now() + interval '10 minutes')`;
    const m = layout(`Your sign-in code: ${code}`, [`Enter ${code} in Growth Planner to sign in. It works for 10 minutes.`, 'If you didn’t ask for this, ignore this email.']);
    const sent = await sendEmail(email, `${code} is your Growth Planner code`, m.html, m.text);
    return json({ ok: true, devCode: !sent && process.env.NODE_ENV !== 'production' ? code : undefined });
  }

  if (b?.step === 'verify') {
    const code = String(b.code || '').replace(/\s/g, '');
    const [row] = await sql`select id, code_hash, attempts from login_codes where email = ${email} and expires_at > now() order by created_at desc limit 1`;
    if (!row) return fail('That code has expired. Ask for a new one.', 400);
    if (row.attempts >= 5) return fail('Too many wrong tries. Ask for a new code.', 429);
    if (row.code_hash !== hash(email, code)) {
      await sql`update login_codes set attempts = attempts + 1 where id = ${row.id}`;
      return fail('That code didn’t match. Check the latest email and try again.', 401);
    }
    let [u] = await sql`select id from users where email = ${email}`;
    if (!u) {
      const name = clean(b.name, 80);
      // Keep the code valid while they finish signing up.
      if (b.name === undefined) return json({ needsProfile: true });
      if (!name) return fail('Enter your name.');
      if (!b.terms) return fail('Please accept the terms and privacy policy to continue.');
      u = { id: await createUser(email, name) };
    }
    await sql`delete from login_codes where email = ${email}`;
    return json({ ok: true, ...(await signInUser(u.id, 'code')) });
  }
  return fail('Unknown step.');
});
