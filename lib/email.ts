/** Sends email through Resend when RESEND_API_KEY is set. Returns false when email is not configured. */
export const emailConfigured = () => !!(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
export const appUrl = () => (process.env.APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')).replace(/\/$/, '');

export async function sendEmail(to: string | string[], subject: string, html: string, text: string): Promise<boolean> {
  if (!emailConfigured()) { console.info(`[email skipped: not configured] to=${to} subject=${subject}`); return false; }
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: process.env.EMAIL_FROM, to, subject, html, text })
  });
  if (!r.ok) console.error('[email failed]', r.status, await r.text().catch(() => ''));
  return r.ok;
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
export function layout(title: string, lines: string[], cta?: { label: string; url: string }) {
  const html = `<div style="font-family:Segoe UI,Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#0E1626">
  <div style="font-weight:800;font-size:18px;margin-bottom:16px">Growth Planner</div>
  <h1 style="font-size:20px;margin:0 0 12px">${esc(title)}</h1>
  ${lines.map((l) => `<p style="font-size:15px;line-height:1.5;margin:0 0 10px">${esc(l)}</p>`).join('')}
  ${cta ? `<p style="margin:20px 0"><a href="${cta.url}" style="background:#3552F2;color:#fff;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:700">${esc(cta.label)}</a></p>` : ''}
  <p style="font-size:12px;color:#5A6479;margin-top:24px">You get this because you use Growth Planner. Change reminders in the app.</p></div>`;
  const text = `${title}\n\n${lines.join('\n')}\n${cta ? `\n${cta.label}: ${cta.url}\n` : ''}`;
  return { html, text };
}
