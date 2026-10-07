import QRCode from 'qrcode';
import { sql, audit } from '@/lib/db';
import { newTotpSecret, verifyTotp, verifyPassword } from '@/lib/crypto';
import { body, fail, json } from '@/lib/http';
import { authed } from '@/lib/route';

export const POST = authed(async (req, { user }) => {
  const b = await body<{ action?: string; code?: string; password?: string }>(req);
  if (b?.action === 'setup') {
    if (user.totp_enabled) return fail('Two-step sign-in is already on.');
    const secret = newTotpSecret();
    await sql`update users set totp_secret = ${secret} where id = ${user.id}`;
    const uri = `otpauth://totp/${encodeURIComponent('Growth Planner:' + user.email)}?secret=${secret}&issuer=${encodeURIComponent('Growth Planner')}`;
    return json({ secret, qr: await QRCode.toDataURL(uri, { margin: 1, width: 200 }) });
  }
  if (b?.action === 'enable') {
    const [u] = await sql`select totp_secret from users where id = ${user.id}`;
    if (!u.totp_secret || !verifyTotp(u.totp_secret, String(b.code || ''))) return fail('That code didn’t work. Try the newest code in your app.');
    await sql`update users set totp_enabled = true where id = ${user.id}`;
    await audit(user.id, null, '2fa_enabled');
    return json({ ok: true });
  }
  if (b?.action === 'disable') {
    const [u] = await sql`select password_hash, totp_secret from users where id = ${user.id}`;
    if (!(await verifyPassword(String(b.password || ''), u.password_hash))) return fail('Your password is wrong.', 401);
    if (!u.totp_secret || !verifyTotp(u.totp_secret, String(b.code || ''))) return fail('That code didn’t work.');
    await sql`update users set totp_enabled = false, totp_secret = null where id = ${user.id}`;
    await audit(user.id, null, '2fa_disabled');
    return json({ ok: true });
  }
  return fail('Unknown action.');
});
