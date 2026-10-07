import { cookies } from 'next/headers';
import { sql, ensureSchema } from './db';
import { token, sha256 } from './crypto';

export const COOKIE = 'gp_session';
const DAYS = 30;

export type User = { id: string; email: string; name: string; totp_enabled: boolean };
export type Ctx = { user: User; companyId: string; role: 'owner' | 'member' };

export async function createSession(userId: string, pending2fa: boolean) {
  const t = token();
  const exp = new Date(Date.now() + (pending2fa ? 10 * 60_000 : DAYS * 86_400_000));
  await sql`insert into sessions (id, user_id, pending_2fa, expires_at) values (${sha256(t)}, ${userId}, ${pending2fa}, ${exp})`;
  (await cookies()).set(COOKIE, t, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', expires: exp });
}

async function sessionRow() {
  const t = (await cookies()).get(COOKIE)?.value;
  if (!t) return null;
  await ensureSchema();
  const [s] = await sql`select s.id, s.pending_2fa, u.id as user_id, u.email, u.name, u.totp_enabled
    from sessions s join users u on u.id = s.user_id where s.id = ${sha256(t)} and s.expires_at > now()`;
  return s || null;
}

/** Session waiting for the two-step code (password already checked). */
export async function pendingUserId(): Promise<string | null> {
  const s = await sessionRow();
  return s && s.pending_2fa ? (s.user_id as string) : null;
}

export async function promotePendingSession() {
  const t = (await cookies()).get(COOKIE)?.value;
  if (!t) return;
  const exp = new Date(Date.now() + DAYS * 86_400_000);
  await sql`update sessions set pending_2fa = false, expires_at = ${exp} where id = ${sha256(t)}`;
  (await cookies()).set(COOKIE, t, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', expires: exp });
}

export async function currentUser(): Promise<User | null> {
  const s = await sessionRow();
  if (!s || s.pending_2fa) return null;
  return { id: s.user_id, email: s.email, name: s.name, totp_enabled: s.totp_enabled };
}

/** The signed-in user plus the company they work in (their first membership). */
export async function context(): Promise<Ctx | null> {
  const user = await currentUser();
  if (!user) return null;
  let [m] = await sql`select company_id, role from memberships where user_id = ${user.id} order by created_at limit 1`;
  if (!m) m = await ensureCompany(user.id);
  return { user, companyId: m.company_id, role: m.role };
}

/** Joins companies the email was invited to, or creates a new company owned by the user. */
export async function ensureCompany(userId: string) {
  const [u] = await sql`select email from users where id = ${userId}`;
  const inv = await sql`update invites set accepted_at = now() where email = ${u.email} and accepted_at is null returning company_id`;
  for (const i of inv) await sql`insert into memberships (company_id, user_id, role) values (${i.company_id}, ${userId}, 'member') on conflict do nothing`;
  let [m] = await sql`select company_id, role from memberships where user_id = ${userId} order by created_at limit 1`;
  if (!m) {
    const [c] = await sql`insert into companies default values returning id`;
    await sql`insert into memberships (company_id, user_id, role) values (${c.id}, ${userId}, 'owner')`;
    await sql`insert into company_state (company_id, data, version) values (${c.id}, null, 0)`;
    m = { company_id: c.id, role: 'owner' };
  }
  return m;
}

export async function destroySession() {
  const t = (await cookies()).get(COOKIE)?.value;
  if (t) await sql`delete from sessions where id = ${sha256(t)}`;
  (await cookies()).delete(COOKIE);
}
