import { sql, audit } from '@/lib/db';
import { body, fail, json } from '@/lib/http';
import { authed } from '@/lib/route';

export const GET = authed(async (_req, { user, companyId, role }) => {
  const [s] = await sql`select data, version, updated_at from company_state where company_id = ${companyId}`;
  return json({ state: s?.data ?? null, version: s?.version ?? 0, role, user: { id: user.id, name: user.name, email: user.email } });
});

/** Saves the whole planner state. Rejects with 409 if someone else saved first. */
export const PUT = authed(async (req, { user, companyId }) => {
  const b = await body<{ state?: unknown; version?: number }>(req, 1_500_000);
  if (!b || typeof b.state !== 'object' || b.state === null) return fail('Nothing to save, or it is larger than 1.5 MB.', 413);
  const st = b.state as { profile?: { company?: string }; sample?: boolean };
  if (st.sample) return fail('Sample data is not saved.');
  const rows = await sql`update company_state set data = ${sql.json(b.state as any)}, version = version + 1, updated_by = ${user.id}, updated_at = now()
    where company_id = ${companyId} and version = ${Number(b.version) || 0} returning version`;
  if (!rows.length) {
    const [cur] = await sql`select data, version from company_state where company_id = ${companyId}`;
    return json({ error: 'Someone else saved changes. Reloaded their version.', state: cur?.data ?? null, version: cur?.version ?? 0 }, 409);
  }
  const name = typeof st.profile?.company === 'string' ? st.profile.company.slice(0, 120) : '';
  if (name) await sql`update companies set name = ${name} where id = ${companyId} and name <> ${name}`;
  return json({ ok: true, version: rows[0].version });
});

/** Clears the company's plan (owner only). */
export const DELETE = authed(async (_req, { user, companyId, role }) => {
  if (role !== 'owner') return fail('Only the owner can delete the plan.', 403);
  const [r] = await sql`update company_state set data = null, version = version + 1, updated_by = ${user.id}, updated_at = now() where company_id = ${companyId} returning version`;
  await audit(user.id, companyId, 'plan_deleted');
  return json({ ok: true, version: r.version });
});
