import { NextResponse } from 'next/server';
import { ensureSchema } from './db';
import { context, type Ctx } from './auth';
import { fail, sameOrigin } from './http';

type H = (req: Request) => Promise<Response>;
type HC = (req: Request, ctx: Ctx) => Promise<Response>;

/** Wraps a handler: schema ready, origin checked on writes, errors turned into clean 500s. */
export function open(h: H): H {
  return async (req) => {
    try {
      if (req.method !== 'GET' && !sameOrigin(req)) return fail('Bad origin', 403);
      await ensureSchema();
      return await h(req);
    } catch (e) { console.error(e); return fail('Something went wrong. Try again.', 500); }
  };
}
/** Same, and requires a signed-in user. */
export function authed(h: HC): H {
  return open(async (req) => {
    const ctx = await context();
    if (!ctx) return fail('Please sign in again.', 401);
    return h(req, ctx);
  });
}
export const noContent = () => new NextResponse(null, { status: 204 });
