import { sql } from '@/lib/db';
import { body, clean, emailOk, fail, json } from '@/lib/http';
import { open } from '@/lib/route';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Public: someone fills in a founder's enquiry form. */
export const POST = (req: Request, { params }: { params: Promise<{ id: string }> }) => open(async () => {
  const { id } = await params;
  if (!UUID.test(id)) return fail('This form link isn’t valid.', 404);
  const [c] = await sql`select id from companies where id = ${id}`;
  if (!c) return fail('This form link isn’t valid.', 404);
  const b = await body<Record<string, unknown>>(req, 20_000);
  if (!b) return fail('Something was missing. Try again.');
  if (clean(b.website)) return json({ ok: true }); // bots fill the hidden field
  const name = clean(b.name, 120), company = clean(b.company, 120), email = clean(b.email, 254).toLowerCase();
  const phone = clean(b.phone, 20).replace(/[^\d+\s-]/g, ''), message = typeof b.message === 'string' ? b.message.trim().slice(0, 2000) : '';
  if (!name) return fail('Add your name.');
  if (!email && !phone) return fail('Add an email or a phone number so we can reply.');
  if (email && !emailOk(email)) return fail('That email address doesn’t look right.');
  if (b.consent !== 'on' && b.consent !== true) return fail('Tick the box so they can reply to you.');
  const [{ n }] = await sql`select count(*)::int as n from inbound_leads where company_id = ${id} and created_at > now() - interval '1 hour'`;
  if (n >= 30) return fail('Too many enquiries right now. Try again in a little while.', 429);
  await sql`insert into inbound_leads (company_id, name, company, email, phone, message) values (${id}, ${name}, ${company || null}, ${email || null}, ${phone || null}, ${message || null})`;
  return json({ ok: true });
})(req);
