'use client';
import { useState } from 'react';

export default function EnquiryForm({ id, company }: { id: string; company: string }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setErr('');
    const f = new FormData(e.currentTarget);
    const data = Object.fromEntries(f.entries());
    if (!data.email && !data.phone) { setErr('Add an email or a phone number so we can reply.'); return; }
    if (data.consent !== 'on') { setErr(`Tick the box so ${company} can reply to you.`); return; }
    setBusy(true);
    try {
      const r = await fetch(`/api/inbound/${id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || 'That didn’t go through. Try again.');
      setDone(true);
    } catch (x: any) { setErr(x.message); } finally { setBusy(false); }
  }

  if (done) return (
    <div className="enq-card" role="status">
      <h1>Thank you.</h1>
      <p className="muted">{company} has your message and will get back to you soon.</p>
    </div>
  );

  return (
    <form className="enq-card" onSubmit={submit} noValidate>
      <div>
        <div className="eyebrow" style={{ fontFamily: 'var(--f-mono)', fontSize: 12, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--muted)' }}>Enquiry</div>
        <h1 style={{ marginTop: 6 }}>Get in touch with {company}</h1>
        <p className="muted" style={{ marginTop: 8 }}>Tell us what you need. We usually reply within a working day.</p>
      </div>
      {err && <div className="err" role="alert">{err}</div>}
      <div className="enq-grid">
        <div className="field"><label htmlFor="q-name">Your name</label><input className="input" id="q-name" name="name" required autoComplete="name" maxLength={120} /></div>
        <div className="field"><label htmlFor="q-co">Business (optional)</label><input className="input" id="q-co" name="company" autoComplete="organization" maxLength={120} /></div>
        <div className="field"><label htmlFor="q-email">Email</label><input className="input" id="q-email" name="email" type="email" autoComplete="email" maxLength={254} /></div>
        <div className="field"><label htmlFor="q-phone">Phone or WhatsApp</label><input className="input" id="q-phone" name="phone" type="tel" autoComplete="tel" maxLength={20} /></div>
        <div className="field wide"><label htmlFor="q-msg">What do you need?</label><textarea className="input" id="q-msg" name="message" rows={4} maxLength={2000} /></div>
      </div>
      <div className="hp" aria-hidden="true"><label htmlFor="q-web">Website</label><input id="q-web" name="website" tabIndex={-1} autoComplete="off" /></div>
      <label className="check"><input type="checkbox" name="consent" /> <span>I agree that {company} can contact me about this enquiry by email, phone or WhatsApp.</span></label>
      <button className="btn primary" disabled={busy}>{busy ? 'Sending…' : 'Send enquiry'}</button>
      <div className="enq-foot">Form by Growth Planner. Your details go only to {company}.</div>
    </form>
  );
}
