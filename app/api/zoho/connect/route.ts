import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { context } from '@/lib/auth';
import { token } from '@/lib/crypto';
import { authUrl, zohoConfigured } from '@/lib/zoho';

/** Owner starts the Zoho Books consent screen. */
export async function GET() {
  const ctx = await context();
  if (!ctx) redirect('/login');
  if (ctx.role !== 'owner') redirect('/app?zoho=owner_only#cash');
  if (!zohoConfigured()) redirect('/app?zoho=not_configured#cash');
  const state = token(24);
  (await cookies()).set('gp_zoho', state, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 600 });
  redirect(authUrl(state));
}
