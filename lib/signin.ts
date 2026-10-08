import { sql, audit } from './db';
import { createSession, ensureCompany } from './auth';

export const googleConfigured = () => !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

/** Starts a session for a user found by a passwordless method. Returns whether a two-step code is still needed. */
export async function signInUser(userId: string, method: string): Promise<{ needs2fa: boolean }> {
  const [u] = await sql`select totp_enabled from users where id = ${userId}`;
  await ensureCompany(userId);
  await createSession(userId, u.totp_enabled);
  await audit(userId, null, u.totp_enabled ? `login_${method}_ok` : `login_${method}`);
  return { needs2fa: u.totp_enabled };
}

export async function createUser(email: string, name: string, extra: { googleSub?: string } = {}) {
  const [u] = await sql`insert into users (email, name, password_hash, google_sub, terms_accepted_at)
    values (${email}, ${name}, null, ${extra.googleSub ?? null}, now()) returning id`;
  const m = await ensureCompany(u.id);
  await audit(u.id, m.company_id, 'signup', { method: extra.googleSub ? 'google' : 'email_code' });
  return u.id as string;
}
