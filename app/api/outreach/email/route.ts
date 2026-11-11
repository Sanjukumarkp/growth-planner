import { sql, audit } from '@/lib/db';
import { body, clean, emailOk, fail, json } from '@/lib/http';
import { authed } from '@/lib/route';
import { emailConfigured } from '@/lib/email';

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

/**
 * Sends one sales email to a lead on the founder's behalf.
 * It goes out from the app's sending address with the founder's name, and replies go to the founder's own inbox.
 */
export const POST = authed(async (req, { user, companyId }) => {
  if (!emailConfigured()) return fail('Sending email isn’t set up on this server yet. Use “Open in Gmail” instead.', 503);
  const b = await body<{ to?: string; subject?: string; body?: string; company?: string }>(req, 40_000);
  const to = clean(b?.to, 254).toLowerCase(), subject = clean(b?.subject, 200).replace(/[\r\n]+/g, ' ');
  const text = typeof b?.body === 'string' ? b.body.trim().slice(0, 8000) : '';
  const company = clean(b?.company, 120).replace(/[<>"\r\n]/g, '');
  if (!emailOk(to)) return fail('That email address doesn’t look right.');
  if (!subject) return fail('Add a subject line.');
  if (!text) return fail('Write the email first.');
  if (to === user.email.toLowerCase()) return fail('That’s your own address. Add the lead’s email instead.');

  const limit = Number(process.env.OUTREACH_DAILY_LIMIT || 40);
  const [{ n }] = await sql`select count(*)::int as n from outreach_sends where company_id = ${companyId} and created_at > now() - interval '24 hours'`;
  if (n >= limit) return fail(`You’ve sent ${limit} emails in the last 24 hours. Sending fewer, more personal emails also keeps them out of spam. Try again tomorrow.`, 429);

  const addr = /<([^>]+)>/.exec(process.env.EMAIL_FROM!)?.[1] || process.env.EMAIL_FROM!;
  const name = (user.name || 'A founder').replace(/[<>"\r\n]/g, '');
  const from = `"${name}${company ? ` (${company})` : ''}" <${addr}>`;
  const footer = `Sent by ${name}${company ? ` of ${company}` : ''} using Growth Planner. Reply to this email to reach ${name.split(' ')[0]} directly. If you’d rather not hear from us, reply “stop” and you won’t be contacted again.`;
  const html = `<div style="font-family:Segoe UI,Arial,sans-serif;font-size:15px;line-height:1.55;color:#0E1626;max-width:600px">${esc(text).replace(/\n/g, '<br>')}<p style="font-size:12px;color:#5A6479;margin-top:28px;border-top:1px solid #DDE2EB;padding-top:10px">${esc(footer)}</p></div>`;

  const r = await fetch(process.env.RESEND_API_URL || 'https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to, reply_to: user.email, subject, html, text: `${text}\n\n--\n${footer}` })
  });
  if (!r.ok) {
    console.error('[outreach email failed]', r.status, await r.text().catch(() => ''));
    return fail('The email couldn’t be sent. Check the address and try again.', 502);
  }
  await sql`insert into outreach_sends (company_id, user_id, to_email, subject) values (${companyId}, ${user.id}, ${to}, ${subject})`;
  await audit(user.id, companyId, 'outreach.email', { to });
  return json({ ok: true, left: limit - n - 1 });
});
