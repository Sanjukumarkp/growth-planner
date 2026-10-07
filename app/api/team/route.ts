import { sql, audit } from '@/lib/db';
import { body, clean, emailOk, fail, json } from '@/lib/http';
import { appUrl, layout, sendEmail } from '@/lib/email';
import { authed } from '@/lib/route';

/** Invite a teammate by email. They join this company when they sign up or next sign in. */
export const POST = authed(async (req, { user, companyId, role }) => {
  if (role !== 'owner') return fail('Only the owner can invite people.', 403);
  const b = await body<{ email?: string }>(req);
  const email = clean(b?.email, 254).toLowerCase();
  if (!emailOk(email)) return fail('Enter a valid email address.');
  const [already] = await sql`select 1 from memberships m join users u on u.id = m.user_id where m.company_id = ${companyId} and u.email = ${email}`;
  if (already) return fail('That person is already on your team.');
  const [u] = await sql`select id from users where email = ${email}`;
  if (u) {
    await sql`insert into memberships (company_id, user_id, role) values (${companyId}, ${u.id}, 'member') on conflict do nothing`;
  } else {
    await sql`insert into invites (company_id, email, invited_by) values (${companyId}, ${email}, ${user.id})`;
  }
  const [c] = await sql`select name from companies where id = ${companyId}`;
  const link = `${appUrl()}/signup?email=${encodeURIComponent(email)}`;
  const m = layout(`${user.name} invited you to ${c.name} on Growth Planner`, ['Growth Planner keeps your startup’s weekly moves, cash forecast and deadlines in one place.', u ? 'Sign in to see the shared plan.' : 'Create your account with this email address to join.'], { label: u ? 'Open Growth Planner' : 'Join the team', url: u ? appUrl() + '/login' : link });
  const sent = await sendEmail(email, `${user.name} invited you to Growth Planner`, m.html, m.text);
  await audit(user.id, companyId, 'invite', { email });
  return json({ ok: true, joined: !!u, emailSent: sent, link });
});

export const DELETE = authed(async (req, { companyId, role }) => {
  if (role !== 'owner') return fail('Only the owner can remove invites.', 403);
  const b = await body<{ inviteId?: string }>(req);
  await sql`delete from invites where id = ${String(b?.inviteId || '')}::uuid and company_id = ${companyId}`;
  return json({ ok: true });
});
