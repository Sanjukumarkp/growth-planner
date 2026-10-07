import { sql, audit } from '@/lib/db';
import { verifyTotp } from '@/lib/crypto';
import { pendingUserId, promotePendingSession } from '@/lib/auth';
import { body, fail, json } from '@/lib/http';
import { open } from '@/lib/route';

export const POST = open(async (req) => {
  const uid = await pendingUserId();
  if (!uid) return fail('Your sign-in expired. Enter your password again.', 401);
  const b = await body<{ code?: string }>(req);
  const [u] = await sql`select email, totp_secret from users where id = ${uid}`;
  const ok = !!u?.totp_secret && verifyTotp(u.totp_secret, String(b?.code || ''));
  await sql`insert into login_attempts (email, ok) values (${u.email}, ${ok})`;
  if (!ok) return fail('That code didn’t work. Check your authenticator app and try again.', 401);
  await promotePendingSession();
  await audit(uid, null, 'login');
  return json({ ok: true });
});
