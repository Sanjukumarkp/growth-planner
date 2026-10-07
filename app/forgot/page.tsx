'use client';
import { useState } from 'react';
import Link from 'next/link';
import AuthShell from '@/components/AuthShell';
import { api } from '@/components/useApi';

export default function Page() {
  const [done, setDone] = useState<null | { emailConfigured: boolean; devLink?: string }>(null);
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setErr(''); setBusy(true);
    try { setDone(await api('/api/auth/forgot', 'POST', { email: new FormData(e.currentTarget).get('email') })); }
    catch (x: any) { setErr(x.message); } finally { setBusy(false); }
  }
  return (
    <AuthShell>
      <form className="auth-form" onSubmit={submit} noValidate>
        <h1>Reset your password.</h1>
        <p className="sub">We’ll email you a link that works for one hour.</p>
        {err && <div className="err" role="alert">{err}</div>}
        {done ? <>
          <div className="ok" role="status">If an account exists for that email, a reset link is on its way.</div>
          {!done.emailConfigured && <p className="small muted">Email sending isn’t set up on this server yet{done.devLink ? <>. Development link: <a href={done.devLink}>reset now</a></> : ', so ask the site owner for help'}.</p>}
        </> : <>
          <div className="field"><label htmlFor="email">Email</label><input className="input" id="email" name="email" type="email" autoComplete="email" required autoFocus /></div>
          <button className="btn primary" disabled={busy}>{busy ? 'Sending…' : 'Send reset link'}</button>
        </>}
        <p className="small"><Link href="/login">Back to sign in</Link></p>
      </form>
    </AuthShell>
  );
}
