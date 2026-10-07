'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/components/useApi';
import { Logo } from '@/components/AuthShell';

type Acct = { user: { name: string; email: string; totp_enabled: boolean }; role: string; members: { id: string; name: string; email: string; role: string }[]; invites: { id: string; email: string }[]; features: { advisor: boolean; email: boolean } };

function Msg({ m }: { m: { ok?: string; err?: string } }) {
  return m.err ? <div className="err" role="alert">{m.err}</div> : m.ok ? <div className="ok" role="status">{m.ok}</div> : null;
}

export default function Settings() {
  const [a, setA] = useState<Acct | null>(null);
  const [m, setM] = useState<Record<string, { ok?: string; err?: string }>>({});
  const [qr, setQr] = useState<{ qr: string; secret: string } | null>(null);
  const load = () => api<Acct>('/api/account', 'GET').then(setA).catch(() => (location.href = '/login'));
  useEffect(() => { load(); }, []);
  const say = (k: string, v: { ok?: string; err?: string }) => setM((s) => ({ ...s, [k]: v }));
  const run = (k: string, fn: (f: FormData) => Promise<string | void>) => async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); const form = e.currentTarget; say(k, {});
    try { const ok = await fn(new FormData(form)); say(k, { ok: ok || 'Saved.' }); form.reset(); load(); } catch (x: any) { say(k, { err: x.message }); }
  };
  if (!a) return <main className="page"><p className="muted">Loading…</p></main>;
  return (
    <main className="page">
      <div className="row" style={{ justifyContent: 'space-between' }}><Link className="brand" href="/app"><Logo /><span>Growth Planner</span></Link><Link className="btn" href="/app">Back to the planner</Link></div>
      <h1 style={{ fontFamily: 'var(--f-display)', fontSize: 34, letterSpacing: '-.02em', margin: 0 }}>Account and team</h1>

      <section className="card"><h2>Your profile</h2><Msg m={m.name || {}} />
        <form className="row" onSubmit={run('name', async (f) => { await api('/api/account', 'PATCH', { name: f.get('name') }); })}>
          <input className="input" style={{ flex: 1, minWidth: 200 }} name="name" defaultValue={a.user.name} aria-label="Your name" />
          <button className="btn">Save name</button></form>
        <p className="small muted">Signed in as {a.user.email}</p>
      </section>

      <section className="card"><h2>Password</h2><Msg m={m.pw || {}} />
        <form className="list" style={{ gap: 10 }} onSubmit={run('pw', async (f) => { await api('/api/account', 'PATCH', { currentPassword: f.get('cur'), newPassword: f.get('new') }); return 'Password changed.'; })}>
          <div className="field"><label htmlFor="cur">Current password</label><input className="input" id="cur" name="cur" type="password" autoComplete="current-password" required /></div>
          <div className="field"><label htmlFor="new">New password</label><input className="input" id="new" name="new" type="password" autoComplete="new-password" minLength={8} required /></div>
          <div><button className="btn">Change password</button></div></form>
      </section>

      <section className="card"><h2>Two-step sign-in</h2><Msg m={m.tfa || {}} />
        {a.user.totp_enabled ? <>
          <p className="ok">On. You’ll need a code from your authenticator app each time you sign in.</p>
          <form className="row" onSubmit={run('tfa', async (f) => { await api('/api/account/2fa', 'POST', { action: 'disable', password: f.get('password'), code: f.get('code') }); return 'Two-step sign-in is off.'; })}>
            <input className="input" style={{ flex: 1, minWidth: 160 }} name="password" type="password" placeholder="Password" aria-label="Password" required />
            <input className="input" style={{ width: 130 }} name="code" inputMode="numeric" placeholder="6-digit code" aria-label="Code" required />
            <button className="btn">Turn off</button></form>
        </> : qr ? <>
          <p>Scan this with Google Authenticator, Microsoft Authenticator or similar, then enter the code it shows.</p>
          <img src={qr.qr} width={200} height={200} alt="QR code for your authenticator app" style={{ borderRadius: 12, background: '#fff' }} />
          <p className="small muted">Can’t scan? Enter this key: <code>{qr.secret}</code></p>
          <form className="row" onSubmit={run('tfa', async (f) => { await api('/api/account/2fa', 'POST', { action: 'enable', code: f.get('code') }); setQr(null); return 'Two-step sign-in is on.'; })}>
            <input className="input" style={{ width: 150 }} name="code" inputMode="numeric" autoComplete="one-time-code" placeholder="6-digit code" aria-label="Code" required />
            <button className="btn primary">Turn on</button></form>
        </> : <>
          <p className="muted">Adds a code from your phone when you sign in, so a leaked password isn’t enough.</p>
          <div><button className="btn" onClick={async () => { try { setQr(await api('/api/account/2fa', 'POST', { action: 'setup' })); } catch (x: any) { say('tfa', { err: x.message }); } }}>Set up two-step sign-in</button></div>
        </>}
      </section>

      <section className="card"><h2>Team</h2><Msg m={m.team || {}} />
        <div className="list">{a.members.map((p) => <div className="li" key={p.id}><span><b>{p.name}</b> <span className="muted small">{p.email}</span></span><span className="pill">{p.role === 'owner' ? 'Owner' : 'Member'}</span></div>)}
          {a.invites.map((i) => <div className="li" key={i.id}><span>{i.email} <span className="muted small">invited</span></span>
            {a.role === 'owner' && <button className="btn" style={{ padding: '4px 10px' }} onClick={async () => { await api('/api/team', 'DELETE', { inviteId: i.id }); load(); }}>Cancel invite</button>}</div>)}</div>
        {a.role === 'owner' ? <form className="row" onSubmit={run('team', async (f) => { const r = await api('/api/team', 'POST', { email: f.get('email') }); return r.joined ? 'Added. They can sign in now.' : r.emailSent ? 'Invite sent.' : `Invite saved. Email isn’t set up yet, so send them this link: ${r.link}`; })}>
          <input className="input" style={{ flex: 1, minWidth: 200 }} name="email" type="email" placeholder="teammate@company.com" aria-label="Teammate email" required />
          <button className="btn primary">Invite</button></form> : <p className="small muted">Only the owner can invite people.</p>}
      </section>

      <section className="card"><h2>Your data</h2>
        <p className="muted">Download everything we store about you and your company, or delete your account. Deleting is permanent.</p>
        <div className="row"><a className="btn" href="/api/export">Download my data (JSON)</a></div>
        <Msg m={m.del || {}} />
        <form className="row" onSubmit={run('del', async (f) => { await api('/api/account', 'DELETE', { password: f.get('password') }); location.href = '/login'; })}>
          <input className="input" style={{ flex: 1, minWidth: 200 }} name="password" type="password" placeholder="Your password, to confirm" aria-label="Password to confirm deletion" required />
          <button className="btn danger">Delete my account</button></form>
        <p className="small muted">If you’re the only member, your company’s plan is deleted too.</p>
      </section>

      <section className="card"><h2>Server features</h2>
        <div className="list"><div className="li"><span>AI advisor</span><span className="pill">{a.features.advisor ? 'On' : 'Needs API key'}</span></div>
          <div className="li"><span>Emails (reset, invites, Monday reminders)</span><span className="pill">{a.features.email ? 'On' : 'Needs email setup'}</span></div></div>
      </section>
      <form onSubmit={async (e) => { e.preventDefault(); await api('/api/auth/logout'); location.href = '/login'; }}><button className="btn">Sign out</button></form>
    </main>
  );
}
