'use client';
import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/components/useApi';

export default function SignupForm({ email }: { email: string }) {
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setErr(''); setBusy(true);
    const f = new FormData(e.currentTarget);
    try {
      await api('/api/auth/signup', 'POST', { name: f.get('name'), email: f.get('email'), password: f.get('password'), terms: f.get('terms') === 'on' });
      location.href = '/app';
    } catch (x: any) { setErr(x.message); setBusy(false); }
  }
  return (
    <form className="auth-form" onSubmit={submit} noValidate>
      <h1>Build your first plan.</h1>
      <p className="sub">Free to start. Takes about 3 minutes.</p>
      {err && <div className="err" role="alert">{err}</div>}
      <div className="field"><label htmlFor="name">Your name</label><input className="input" id="name" name="name" autoComplete="name" required autoFocus /></div>
      <div className="field"><label htmlFor="email">Work email</label><input className="input" id="email" name="email" type="email" autoComplete="email" defaultValue={email} required /></div>
      <div className="field"><label htmlFor="password">Password</label><input className="input" id="password" name="password" type="password" autoComplete="new-password" minLength={8} required /><span className="small muted">At least 8 characters.</span></div>
      <label className="check"><input type="checkbox" name="terms" /> <span>I agree to the <Link href="/terms" target="_blank">terms</Link> and <Link href="/privacy" target="_blank">privacy policy</Link>, including storing my company’s financial figures to run the planner.</span></label>
      <button className="btn primary" disabled={busy}>{busy ? 'Creating account…' : 'Create account'}</button>
      <p className="small muted">Already have an account? <Link href="/login">Sign in</Link></p>
    </form>
  );
}
