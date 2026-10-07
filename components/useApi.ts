'use client';
export async function api<T = any>(path: string, method = 'POST', data?: unknown): Promise<T> {
  const r = await fetch(path, { method, headers: { 'Content-Type': 'application/json' }, body: data === undefined ? undefined : JSON.stringify(data) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'Something went wrong. Try again.');
  return j as T;
}
