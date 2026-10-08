import postgres from 'postgres';
import { SCHEMA } from './schema';

declare global {
  // eslint-disable-next-line no-var
  var __gpSql: postgres.Sql | undefined;
  // eslint-disable-next-line no-var
  var __gpSchema: Promise<void> | undefined;
}

function client() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  const local = /localhost|127\.0\.0\.1|host=\/tmp/.test(url);
  // Supabase's transaction pooler (port 6543) does not support prepared statements.
  const pooled = /pooler\.supabase\.com|:6543\//.test(url);
  return postgres(url, { max: 5, idle_timeout: 20, ssl: local ? false : 'require', prepare: !pooled, onnotice: () => {} });
}

export const sql: postgres.Sql = globalThis.__gpSql ?? (globalThis.__gpSql = client());

/** Creates tables on first use. Idempotent. */
export function ensureSchema(): Promise<void> {
  if (!globalThis.__gpSchema) {
    globalThis.__gpSchema = sql.unsafe(SCHEMA).then(() => undefined).catch((e) => { globalThis.__gpSchema = undefined; throw e; });
  }
  return globalThis.__gpSchema;
}

export async function audit(userId: string | null, companyId: string | null, action: string, meta?: unknown) {
  try { await sql`insert into audit_log (user_id, company_id, action, meta) values (${userId}, ${companyId}, ${action}, ${meta ? sql.json(meta as any) : null})`; } catch { /* never block on audit */ }
}
