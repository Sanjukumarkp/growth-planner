import { sql, audit } from '@/lib/db';
import { hashPassword, sha256 } from '@/lib/crypto';
import { body, fail, json } from '@/lib/http';
import { open } from '@/lib/route';

export const POST = open(async (req) => {
  const b = await body<{ token?: string; password?: string }>(req);
  const pw = typeof b?.password === 'string' ? b.password : '';
  if (pw.length < 8 || pw.length > 200) return fail('Use a password of at least 8 characters.');
  const [r] = await sql`update password_resets set used_at = now() where token_hash = ${sha256(String(b?.token || ''))} and used_at is null and expires_at > now() returning user_id`;
  if (!r) return fail('This reset link has expired or was already used. Ask for a new one.', 400);
  await sql`update users set password_hash = ${await hashPassword(pw)} where id = ${r.user_id}`;
  await sql`delete from sessions where user_id = ${r.user_id}`;
  await audit(r.user_id, null, 'password_reset');
  return json({ ok: true });
});
