/** Server-side digest of a company's plan, for reminder emails. Mirrors the app's own maths. */
type St = any;
const DAY = 864e5;
const inr = (n: number) => { const a = Math.abs(n), s = n < 0 ? '−' : ''; if (a >= 1e7) return `${s}₹${(a / 1e7).toFixed(2).replace(/\.?0+$/, '')} Cr`; if (a >= 1e5) return `${s}₹${(a / 1e5).toFixed(1).replace(/\.0$/, '')} L`; return `${s}₹${Math.round(a).toLocaleString('en-IN')}`; };
const MONL = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const iso = (d: Date) => d.toISOString().slice(0, 10);
const parse = (s: string) => new Date(s + 'T00:00:00Z');

export function digest(st: St, today = new Date()) {
  const p = st?.profile || {};
  const lines: string[] = [];
  const t0 = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  if (p.stage !== 'idea') {
    const net = (p.spend || 0) - (p.rev || 0);
    lines.push(net > 0 ? `Runway: about ${((p.cash || 0) / net).toFixed(1)} months (${inr(p.cash || 0)} in the bank, burning ${inr(net)} a month).` : `Cash: ${inr(p.cash || 0)} in the bank, and you earn more than you spend.`);
    const od = (st.recv || []).filter((r: any) => !r.paid && parse(r.due) < t0).sort((a: any, b: any) => b.amt - a.amt);
    if (od.length) lines.push(`${od.length} unpaid ${od.length === 1 ? 'invoice is' : 'invoices are'} overdue, the largest ${inr(od[0].amt)} from ${od[0].who}.`);
    // Monthly filings due in the next 10 days that are not ticked off.
    const done = st.compDone || {}; const due: string[] = [];
    for (let k = 0; k < 2; k++) {
      const y = t0.getUTCFullYear(), m = t0.getUTCMonth() + k, prev = MONL[(((m % 12) + 12) % 12 + 11) % 12];
      const items: [number, string, string][] = [[m % 12 === 3 ? 30 : 7, `TDS deposit for ${prev}`, 'TDS'], [11, `GSTR-1 for ${prev}`, 'GST'], [20, `GSTR-3B for ${prev}`, 'GST']];
      for (const [d, title, type] of items) {
        const dt = new Date(Date.UTC(y, m, d)); const id = type + '-' + iso(dt) + '-' + title.slice(0, 12).replace(/\W/g, '');
        if (dt >= t0 && (+dt - +t0) / DAY <= 10 && !done[id]) due.push(`${title} by ${dt.getUTCDate()} ${MONL[dt.getUTCMonth()].slice(0, 3)}`);
      }
    }
    if (due.length) lines.push(`Filings due soon: ${due.join('; ')}.`);
  } else {
    const paid = (st.first10 || []).filter((c: any) => c.s === 'Paid').length;
    lines.push(`First-10 list: ${paid} paying customers so far.`);
  }
  const late = (st.items || []).filter((i: any) => i.status !== 'done' && parse(i.due) < t0).length;
  if (late) lines.push(`${late} ${late === 1 ? 'initiative is' : 'initiatives are'} overdue.`);
  return { company: p.company || 'your startup', name: (p.name || '').split(' ')[0] || 'there', lines };
}
