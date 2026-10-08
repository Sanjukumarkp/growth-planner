import { json, fail } from '@/lib/http';
import { authed } from '@/lib/route';
import { disconnect, status } from '@/lib/zoho';

export const GET = authed(async (_req, { companyId }) => json(await status(companyId)));

export const DELETE = authed(async (_req, { user, companyId, role }) => {
  if (role !== 'owner') return fail('Only the owner can disconnect Zoho Books.', 403);
  await disconnect(companyId, user.id);
  return json({ ok: true });
});
