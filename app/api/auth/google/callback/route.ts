import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { sql, ensureSchema } from '@/lib/db';
import { appUrl } from '@/lib/email';
import { createUser, signInUser } from '@/lib/signin';

export async function GET(req: Request) {
  const u = new URL(req.url), jar = await cookies();
  const state = jar.get('gp_oauth')?.value;
  jar.delete('gp_oauth');
  if (!state || u.searchParams.get('state') !== state || !u.searchParams.get('code')) redirect('/login?error=google_failed');
  let dest = '/app';
  try {
    await ensureSchema();
    const tok = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ code: u.searchParams.get('code')!, client_id: process.env.GOOGLE_CLIENT_ID!, client_secret: process.env.GOOGLE_CLIENT_SECRET!, redirect_uri: `${appUrl()}/api/auth/google/callback`, grant_type: 'authorization_code' })
    }).then((r) => r.json());
    if (!tok.access_token) throw new Error('no access token');
    const info = await fetch('https://openidconnect.googleapis.com/v1/userinfo', { headers: { Authorization: `Bearer ${tok.access_token}` } }).then((r) => r.json());
    if (!info.sub || !info.email || info.email_verified !== true) throw new Error('unverified Google email');
    const email = String(info.email).toLowerCase();
    let [user] = await sql`select id, google_sub from users where google_sub = ${info.sub} or email = ${email} order by (google_sub = ${info.sub}) desc limit 1`;
    if (user && !user.google_sub) await sql`update users set google_sub = ${info.sub} where id = ${user.id}`;
    const id = user ? user.id : await createUser(email, String(info.name || email.split('@')[0]).slice(0, 80), { googleSub: info.sub });
    const r = await signInUser(id, 'google');
    if (r.needs2fa) dest = '/login?step=2fa';
  } catch (e) { console.error('[google sign-in]', e); dest = '/login?error=google_failed'; }
  redirect(dest.startsWith('/') ? dest : appUrl());
}
