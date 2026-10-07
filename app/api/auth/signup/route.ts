import { sql, audit } from '@/lib/db';
import { hashPassword } from '@/lib/crypto';
import { createSession, ensureCompany } from '@/lib/auth';
import { body, clean, emailOk, fail, json } from '@/lib/http';
import { open } from '@/lib/route';

export const POST = open(async (req) => {
  const b = await body<{ name?: string; email?: string; password?: string; terms?: boolean }>(req);
  const email = clean(b?.email, 254).toLowerCase(), name = clean(b?.name, 80), pw = typeof b?.password === 'string' ? b.password : '';
  if (!name) return fail('Enter your name.');
  if (!emailOk(email)) return fail('Enter a valid email address.');
  if (pw.length < 8 || pw.length > 200) return fail('Use a password of at least 8 characters.');
  if (!b?.terms) return fail('Please accept the terms and privacy policy to continue.');
  const [exists] = await sql`select 1 from users where email = ${email}`;
  if (exists) return fail('An account with this email already exists. Sign in instead.', 409);
  const [u] = await sql`insert into users (email, name, password_hash, terms_accepted_at) values (${email}, ${name}, ${await hashPassword(pw)}, now()) returning id`;
  const m = await ensureCompany(u.id);
  await createSession(u.id, false);
  await audit(u.id, m.company_id, 'signup');
  return json({ ok: true });
});
