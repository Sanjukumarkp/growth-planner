'use client';
import { use, useState } from 'react';
import Link from 'next/link';
import AuthShell from '@/components/AuthShell';
import { api } from '@/components/useApi';

export default function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [ok, setOk] = useState(false); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setErr('');
    const f = new FormData(e.currentTarget);
    if (f.get('password') !== f.get('confirm')) { setErr('The two passwords don’t match.'); return; }
    setBusy(true);
    try { await api('/api/auth/reset', 'POST', { token, password: f.get('password') }); setOk(true); }
    catch (x: any) { setErr(x.message); } finally { setBusy(false); }
  }
  return (
    <AuthShell>
      <form className="auth-form" onSubmit={submit} noValidate>
        <h1>Choose a new password.</h1>
        {err && <div className="err" role="alert">{err}</div>}
        {ok ? <><div className="ok" role="status">Password changed. You’ve been signed out everywhere.</div><Link className="btn primary" href="/login">Sign in</Link></> : <>
          <div className="field"><label htmlFor="password">New password</label><input className="input" id="password" name="password" type="password" autoComplete="new-password" minLength={8} required autoFocus /></div>
          <div className="field"><label htmlFor="confirm">Type it again</label><input className="input" id="confirm" name="confirm" type="password" autoComplete="new-password" required /></div>
          <button className="btn primary" disabled={busy}>{busy ? 'Saving…' : 'Save password'}</button>
        </>}
      </form>
    </AuthShell>
  );
}
