import { NextResponse } from 'next/server';

export const json = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
export const fail = (message: string, status = 400) => json({ error: message }, status);

/** Blocks cross-site form posts: state-changing requests must come from our own origin. */
export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get('origin');
  if (!origin) return true; // same-origin fetches from some browsers omit it; cookies are SameSite=Lax
  try { return new URL(origin).host === (req.headers.get('x-forwarded-host') || req.headers.get('host')); } catch { return false; }
}

export async function body<T = Record<string, unknown>>(req: Request, max = 1_500_000): Promise<T | null> {
  const len = Number(req.headers.get('content-length') || 0);
  if (len > max) return null;
  try { const t = await req.text(); if (t.length > max) return null; return JSON.parse(t) as T; } catch { return null; }
}

export const emailOk = (e: unknown): e is string => typeof e === 'string' && e.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
export const clean = (s: unknown, max = 120) => (typeof s === 'string' ? s.trim().slice(0, max) : '');
