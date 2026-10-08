import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

/** AES-256-GCM for tokens at rest. Key comes from ENCRYPTION_KEY (falls back to CRON_SECRET). */
function key() {
  const k = process.env.ENCRYPTION_KEY || process.env.CRON_SECRET;
  if (!k) throw new Error('Set ENCRYPTION_KEY to store connection tokens');
  return createHash('sha256').update(k).digest();
}
export function encrypt(plain: string): string {
  const iv = randomBytes(12), c = createCipheriv('aes-256-gcm', key(), iv);
  const enc = Buffer.concat([c.update(plain, 'utf8'), c.final()]);
  return ['v1', iv.toString('base64'), c.getAuthTag().toString('base64'), enc.toString('base64')].join('.');
}
export function decrypt(blob: string): string {
  const [v, iv, tag, enc] = blob.split('.');
  if (v !== 'v1') throw new Error('Unknown token format');
  const d = createDecipheriv('aes-256-gcm', key(), Buffer.from(iv, 'base64'));
  d.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([d.update(Buffer.from(enc, 'base64')), d.final()]).toString('utf8');
}
