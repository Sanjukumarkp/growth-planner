import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { token } from '@/lib/crypto';
import { appUrl } from '@/lib/email';
import { googleConfigured } from '@/lib/signin';

export async function GET() {
  if (!googleConfigured()) redirect('/login?error=google_off');
  const state = token(24);
  (await cookies()).set('gp_oauth', state, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 600 });
  const q = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!, redirect_uri: `${appUrl()}/api/auth/google/callback`,
    response_type: 'code', scope: 'openid email profile', state, prompt: 'select_account'
  });
  redirect(`https://accounts.google.com/o/oauth2/v2/auth?${q}`);
}
