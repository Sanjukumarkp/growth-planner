'use client';
import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/components/useApi';

export default function LoginForm() {
  const [step, setStep] = useState<'pw' | 'code'>('pw');
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setErr(''); setBusy(true);
    const f = new FormData(e.currentTarget);
    try {
      if (step === 'pw') {
        const r = await api('/api/auth/login', 'POST', { email: f.get('email'), password: f.get('password') });
        if (r.needs2fa) { setStep('code'); setBusy(false); return; }
      } else await api('/api/auth/2fa', 'POST', { code: f.get('code') });
      location.href = '/app';
    } catch (x: any) { setErr(x.message); setBusy(false); }
  }
  return (
    <form className="auth-form" onSubmit={submit} noValidate>
      <h1>{step === 'pw' ? 'Welcome back.' : 'One more step.'}</h1>
      <p className="sub">{step === 'pw' ? 'Sign in to see this week’s moves.' : 'Enter the 6-digit code from your authenticator app.'}</p>
      {err && <div className="err" role="alert">{err}</div>}
      {step === 'pw' ? <>
        <div className="field"><label htmlFor="email">Email</label><input className="input" id="email" name="email" type="email" autoComplete="email" required autoFocus /></div>
        <div className="field"><label htmlFor="password">Password</label><input className="input" id="password" name="password" type="password" autoComplete="current-password" required /></div>
      </> : <div className="field"><label htmlFor="code">Code</label><input className="input" id="code" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required autoFocus /></div>}
      <button className="btn primary" disabled={busy}>{busy ? 'Signing in…' : step === 'pw' ? 'Sign in' : 'Verify'}</button>
      <div className="row small"><Link href="/forgot">Forgot password?</Link><span className="muted">·</span><span className="muted">New here? <Link href="/signup">Create an account</Link></span></div>
    </form>
  );
}
