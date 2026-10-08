import { fail, json } from '@/lib/http';
import { authed } from '@/lib/route';
import { sync } from '@/lib/zoho';

export const maxDuration = 60;

export const POST = authed(async (_req, { user, companyId }) => {
  try { return json({ ok: true, result: await sync(companyId, user.id) }); }
  catch (e: any) { return fail(e.message, 502); }
});
