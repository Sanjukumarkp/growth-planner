import { sql, audit } from '@/lib/db';
import { hashPassword, verifyPassword } from '@/lib/crypto';
import { destroySession } from '@/lib/auth';
import { body, clean, fail, json } from '@/lib/http';
import { emailConfigured } from '@/lib/email';
import { authed } from '@/lib/route';

export const GET = authed(async (_req, { user, companyId, role }) => {
  const members = await sql`select u.id, u.name, u.email, m.role from memberships m join users u on u.id = m.user_id where m.company_id = ${companyId} order by m.created_at`;
  const invites = await sql`select id, email, created_at from invites where company_id = ${companyId} and accepted_at is null order by created_at desc`;
  return json({ user, companyId, role, members, invites, features: { advisor: !!process.env.ANTHROPIC_API_KEY, email: emailConfigured() } });
});

export const PATCH = authed(async (req, { user }) => {
  const b = await body<{ name?: string; currentPassword?: string; newPassword?: string }>(req);
  if (b?.name !== undefined) {
    const name = clean(b.name, 80); if (!name) return fail('Enter your name.');
    await sql`update users set name = ${name} where id = ${user.id}`;
  }
  if (b?.newPassword !== undefined) {
    const [u] = await sql`select password_hash from users where id = ${user.id}`;
    if (!(await verifyPassword(String(b.currentPassword || ''), u.password_hash))) return fail('Your current password is wrong.', 401);
    if (String(b.newPassword).length < 8) return fail('Use a password of at least 8 characters.');
    await sql`update users set password_hash = ${await hashPassword(String(b.newPassword))} where id = ${user.id}`;
    await audit(user.id, null, 'password_changed');
  }
  return json({ ok: true });
});

/** Deletes the account. Companies where this user is the only member are deleted too. */
export const DELETE = authed(async (req, { user }) => {
  const b = await body<{ password?: string }>(req);
  const [u] = await sql`select password_hash from users where id = ${user.id}`;
  if (!(await verifyPassword(String(b?.password || ''), u.password_hash))) return fail('Your password is wrong.', 401);
  await sql.begin(async (tx) => {
    await tx`delete from companies c where exists (select 1 from memberships m where m.company_id = c.id and m.user_id = ${user.id})
      and (select count(*) from memberships m2 where m2.company_id = c.id) = 1`;
    await tx`delete from users where id = ${user.id}`;
  });
  await audit(null, null, 'account_deleted', { userId: user.id });
  await destroySession();
  return json({ ok: true });
});
