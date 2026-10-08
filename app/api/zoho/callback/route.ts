import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { context } from '@/lib/auth';
import { connect, sync } from '@/lib/zoho';

export const maxDuration = 60;

export async function GET(req: Request) {
  const u = new URL(req.url), jar = await cookies();
  const state = jar.get('gp_zoho')?.value; jar.delete('gp_zoho');
  const ctx = await context();
  if (!ctx) redirect('/login');
  if (u.searchParams.get('error')) redirect('/app?zoho=denied#cash');
  const code = u.searchParams.get('code'), server = u.searchParams.get('accounts-server') || 'https://accounts.zoho.com';
  if (!state || state !== u.searchParams.get('state') || !code || ctx.role !== 'owner') redirect('/app?zoho=failed#cash');
  let dest = '/app?zoho=connected#cash';
  try {
    await connect(ctx.companyId, ctx.user.id, code, server);
    try { await sync(ctx.companyId, ctx.user.id); } catch (e) { console.error('[zoho first sync]', e); dest = '/app?zoho=sync_failed#cash'; }
  } catch (e) { console.error('[zoho connect]', e); dest = '/app?zoho=failed#cash'; }
  redirect(dest);
}
