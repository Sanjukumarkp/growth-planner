'use client';
import { useState } from 'react';
import Link from 'next/link';
import { api } from './useApi';

type Props = { mode: 'login' | 'signup'; google: boolean; emailCodes: boolean; email?: string; start2fa?: boolean; error?: string };
type Step = 'start' | 'code' | 'profile' | 'password' | '2fa';

const ERRORS: Record<string, string> = {
  google_off: 'Google sign-in isn’t set up on this server yet. Use an email code or a password.',
  google_failed: 'Google sign-in didn’t finish. Try again, or use an email code.'
};

const G = () => <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>;

export default function AuthForm({ mode, google, emailCodes, email: email0 = '', start2fa, error }: Props) {
  const [step, setStep] = useState<Step>(start2fa ? '2fa' : emailCodes ? 'start' : 'password');
  const [email, setEmail] = useState(email0);
  const [err, setErr] = useState(error ? ERRORS[error] || '' : '');
  const [note, setNote] = useState(''); const [busy, setBusy] = useState(false);
  const signup = mode === 'signup';

  const go = async (fn: () => Promise<void>) => { setErr(''); setBusy(true); try { await fn(); } catch (x: any) { setErr(x.message); } finally { setBusy(false); } };
  const done = (r: { needs2fa?: boolean }) => { if (r.needs2fa) { setStep('2fa'); return; } location.href = '/app'; };

  async function sendCode(addr = email) {
    const r = await api('/api/auth/code', 'POST', { step: 'send', email: addr });
    setStep('code'); setNote(r.devCode ? `Email isn’t set up on this development server. Your code is ${r.devCode}.` : `We sent a 6-digit code to ${addr}. It works for 10 minutes.`);
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); const f = new FormData(e.currentTarget);
    if (step === 'start') return go(async () => { const em = String(f.get('email') || ''); setEmail(em); await sendCode(em); });
    if (step === 'code' || step === 'profile') return go(async () => {
      const r = await api('/api/auth/code', 'POST', { step: 'verify', email, code: f.get('code'), name: step === 'profile' ? String(f.get('name') || '') : undefined, terms: f.get('terms') === 'on' });
      if (r.needsProfile) { setStep('profile'); setNote('New here. Tell us your name to create your account.'); return; }
      done(r);
    });
    if (step === 'password') return go(async () => {
      if (signup) { await api('/api/auth/signup', 'POST', { name: f.get('name'), email: f.get('email'), password: f.get('password'), terms: f.get('terms') === 'on' }); location.href = '/app'; return; }
      done(await api('/api/auth/login', 'POST', { email: f.get('email'), password: f.get('password') }));
    });
    if (step === '2fa') return go(async () => { await api('/api/auth/2fa', 'POST', { code: f.get('totp') }); location.href = '/app'; });
  }

  const title = step === '2fa' ? 'One more step.' : step === 'code' || step === 'profile' ? 'Check your email.' : signup ? 'Build your first plan.' : 'Welcome back.';
  const sub = step === '2fa' ? 'Enter the 6-digit code from your authenticator app.' : step === 'code' || step === 'profile' ? '' : signup ? 'Free to start. Takes about 3 minutes.' : 'Sign in to see this week’s moves.';
  const terms = <label className="check"><input type="checkbox" name="terms" /> <span>I agree to the <Link href="/terms" target="_blank">terms</Link> and <Link href="/privacy" target="_blank">privacy policy</Link>, including storing my company’s financial figures to run the planner.</span></label>;

  return (
    <form className="auth-form" onSubmit={submit} noValidate>
      <h1>{title}</h1>{sub && <p className="sub">{sub}</p>}
      {err && <div className="err" role="alert">{err}</div>}
      {note && !err && <div className="ok" role="status">{note}</div>}

      {(step === 'start' || step === 'password') && google && <>
        <a className="btn" href="/api/auth/google"><G /> Continue with Google</a>
        <div className="or"><span>or</span></div>
      </>}

      {step === 'start' && <>
        <div className="field"><label htmlFor="email">Email</label><input className="input" id="email" name="email" type="email" autoComplete="email" defaultValue={email} required autoFocus /></div>
        <button className="btn primary" disabled={busy}>{busy ? 'Sending…' : 'Email me a code'}</button>
        <button type="button" className="linkbtn" onClick={() => { setErr(''); setStep('password'); }}>{signup ? 'Sign up with a password instead' : 'Use my password instead'}</button>
      </>}

      {(step === 'code' || step === 'profile') && <>
        <div className="field"><label htmlFor="code">6-digit code</label><input className="input code" id="code" name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} required autoFocus={step === 'code'} /></div>
        {step === 'profile' && <><div className="field"><label htmlFor="name">Your name</label><input className="input" id="name" name="name" autoComplete="name" required autoFocus /></div>{terms}</>}
        <button className="btn primary" disabled={busy}>{busy ? 'Checking…' : step === 'profile' ? 'Create account' : 'Continue'}</button>
        <div className="row small"><button type="button" className="linkbtn" disabled={busy} onClick={() => go(() => sendCode())}>Send a new code</button><span className="muted">·</span><button type="button" className="linkbtn" onClick={() => { setStep('start'); setNote(''); }}>Use a different email</button></div>
      </>}

      {step === 'password' && <>
        {signup && <div className="field"><label htmlFor="name">Your name</label><input className="input" id="name" name="name" autoComplete="name" required autoFocus /></div>}
        <div className="field"><label htmlFor="email">Email</label><input className="input" id="email" name="email" type="email" autoComplete="email" defaultValue={email} required autoFocus={!signup} /></div>
        <div className="field"><label htmlFor="password">Password</label><input className="input" id="password" name="password" type="password" autoComplete={signup ? 'new-password' : 'current-password'} minLength={signup ? 8 : undefined} required />{signup && <span className="small muted">At least 8 characters.</span>}</div>
        {signup && terms}
        <button className="btn primary" disabled={busy}>{busy ? 'Please wait…' : signup ? 'Create account' : 'Sign in'}</button>
        {emailCodes && <button type="button" className="linkbtn" onClick={() => { setErr(''); setStep('start'); }}>{signup ? 'Sign up with an email code instead' : 'Email me a code instead'}</button>}
      </>}

      {step === '2fa' && <>
        <div className="field"><label htmlFor="totp">Code</label><input className="input code" id="totp" name="totp" inputMode="numeric" autoComplete="one-time-code" maxLength={6} required autoFocus /></div>
        <button className="btn primary" disabled={busy}>{busy ? 'Checking…' : 'Verify'}</button>
      </>}

      {step !== '2fa' && <p className="small muted">
        {signup ? <>Already have an account? <Link href="/login">Sign in</Link></> : <>New here? <Link href="/signup">Create an account</Link> · <Link href="/forgot">Forgot password?</Link></>}
      </p>}
      {(step === 'start' || step === 'password') && google && signup && <p className="small muted">Continuing with Google means you agree to the terms and privacy policy.</p>}
    </form>
  );
}
