import { destroySession } from '@/lib/auth';
import { json } from '@/lib/http';
import { open } from '@/lib/route';
export const POST = open(async () => { await destroySession(); return json({ ok: true }); });
