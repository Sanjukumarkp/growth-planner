import { sql, audit } from '@/lib/db';
import { authed } from '@/lib/route';

/** Everything we hold about the user and their company, as one JSON file. */
export const GET = authed(async (_req, { user, companyId }) => {
  const [c] = await sql`select id, name, created_at from companies where id = ${companyId}`;
  const [s] = await sql`select data, version, updated_at from company_state where company_id = ${companyId}`;
  const members = await sql`select u.name, u.email, m.role from memberships m join users u on u.id = m.user_id where m.company_id = ${companyId}`;
  await audit(user.id, companyId, 'export');
  const out = { exportedAt: new Date().toISOString(), user: { name: user.name, email: user.email }, company: c, members, plan: s?.data ?? null };
  const file = `growth-planner-${(c?.name || 'export').replace(/\W+/g, '-').toLowerCase()}.json`;
  return new Response(JSON.stringify(out, null, 2), { headers: { 'Content-Type': 'application/json', 'Content-Disposition': `attachment; filename="${file}"`, 'Cache-Control': 'no-store' } });
});
