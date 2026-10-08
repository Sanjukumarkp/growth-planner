import { sql, ensureSchema } from '@/lib/db';
import { digest } from '@/lib/summary';
import { appUrl, emailConfigured, layout, sendEmail } from '@/lib/email';
import { json, fail } from '@/lib/http';
import { sync as zohoSync } from '@/lib/zoho';

export const maxDuration = 60;

/** Runs daily at 09:00 IST (Vercel cron). Syncs Zoho Books, then sends the Monday plan and the 1st-of-month close reminder. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) return fail('Unauthorised', 401);
  await ensureSchema();
  // Refresh every Zoho Books connection first, so the emails use today's figures.
  let synced = 0;
  for (const z of await sql`select company_id from zoho_connections`) {
    try { await zohoSync(z.company_id, null); synced++; } catch (e) { console.error('[cron zoho]', z.company_id, e); }
  }
  if (!emailConfigured()) return json({ synced, skipped: 'email not configured' });
  const ist = new Date(Date.now() + 5.5 * 3600_000);
  const monday = ist.getUTCDay() === 1, first = ist.getUTCDate() === 1;
  if (!monday && !first) return json({ synced, sent: 0, reason: 'not a reminder day' });
  const period = ist.toISOString().slice(0, 10);
  const rows = await sql`select cs.company_id, cs.data from company_state cs where cs.data is not null`;
  let sent = 0;
  for (const r of rows) {
    const st = r.data, rem = st?.reminders || {};
    const kinds = [monday && rem.monday !== false ? 'monday' : null, first && rem.close !== false && st?.profile?.stage !== 'idea' ? 'close' : null].filter(Boolean) as string[];
    for (const kind of kinds) {
      const [claimed] = await sql`insert into reminder_log (company_id, kind, period) values (${r.company_id}, ${kind}, ${period}) on conflict do nothing returning 1`;
      if (!claimed) continue;
      const to = (await sql`select u.email from memberships m join users u on u.id = m.user_id where m.company_id = ${r.company_id}`).map((x) => x.email as string);
      if (!to.length) continue;
      const d = digest(st);
      const m = kind === 'monday'
        ? layout(`Morning ${d.name}, your week at ${d.company}`, [...d.lines, 'Your three moves for this week are ready in the app.'], { label: 'See this week’s moves', url: appUrl() })
        : layout(`Time to close last month for ${d.company}`, ['Enter three numbers (sales, spend and bank balance) so your runway and forecast stay true. It takes two minutes.', ...d.lines], { label: 'Close the month', url: appUrl() });
      if (await sendEmail(to, kind === 'monday' ? `Your week at ${d.company}` : `Close last month for ${d.company}`, m.html, m.text)) sent++;
    }
  }
  return json({ synced, sent });
}
