import { sql, audit } from '@/lib/db';
import { verifyPassword } from '@/lib/crypto';
import { createSession } from '@/lib/auth';
import { body, clean, fail, json } from '@/lib/http';
import { open } from '@/lib/route';

export const POST = open(async (req) => {
  const b = await body<{ email?: string; password?: string }>(req);
  const email = clean(b?.email, 254).toLowerCase(), pw = typeof b?.password === 'string' ? b.password : '';
  const [{ n }] = await sql`select count(*)::int as n from login_attempts where email = ${email} and not ok and at > now() - interval '15 minutes'`;
  if (n >= 8) return fail('Too many attempts. Wait 15 minutes, or reset your password.', 429);
  const [u] = await sql`select id, password_hash, totp_enabled from users where email = ${email}`;
  const ok = !!u && await verifyPassword(pw, u.password_hash);
  await sql`insert into login_attempts (email, ok) values (${email}, ${ok})`;
  if (!ok) return fail('That email and password don’t match.', 401);
  await createSession(u.id, u.totp_enabled);
  await audit(u.id, null, u.totp_enabled ? 'login_password_ok' : 'login');
  return json({ ok: true, needs2fa: u.totp_enabled });
});
