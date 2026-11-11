import { sql } from '@/lib/db';
import { body, json } from '@/lib/http';
import { authed } from '@/lib/route';

/** New enquiries from the company's public form that the planner hasn't picked up yet. */
export const GET = authed(async (_req, { companyId }) => {
  const items = await sql`select id, name, company, email, phone, message, created_at from inbound_leads
    where company_id = ${companyId} and not imported order by created_at limit 200`;
  return json({ items });
});

/** The planner saved these as leads: don't hand them out again. */
export const POST = authed(async (req, { companyId }) => {
  const b = await body<{ ack?: unknown[] }>(req, 20_000);
  const ids = (b?.ack || []).map(Number).filter((n) => Number.isInteger(n) && n > 0).slice(0, 200);
  if (ids.length) await sql`update inbound_leads set imported = true where company_id = ${companyId} and id = any(${ids})`;
  return json({ ok: true });
});
