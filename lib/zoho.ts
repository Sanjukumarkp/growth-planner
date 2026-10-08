import { sql, audit } from './db';
import { encrypt, decrypt } from './secret';
import { appUrl } from './email';

/**
 * Zoho Books connection (read-only).
 * OAuth 2.0 with Zoho's multi data-centre flow: the callback names the user's accounts server
 * (for India, https://accounts.zoho.in) and the token reply names the API domain (https://www.zohoapis.in).
 */

export const SCOPES = ['ZohoBooks.settings.READ', 'ZohoBooks.invoices.READ', 'ZohoBooks.bills.READ', 'ZohoBooks.expenses.READ', 'ZohoBooks.banking.READ'];
export const zohoConfigured = () => !!(process.env.ZOHO_CLIENT_ID && process.env.ZOHO_CLIENT_SECRET);
export const redirectUri = () => `${appUrl()}/api/zoho/callback`;
const AUTH_BASE = () => (process.env.ZOHO_ACCOUNTS_URL || 'https://accounts.zoho.com').replace(/\/$/, '');

const ZOHO_TLDS = '(com|in|eu|com\\.au|jp|ca|sa|com\\.cn|uk)';
/** Only Zoho's own servers may receive our client secret or tokens. */
export function allowedAccountsServer(u: string): boolean {
  if (u.replace(/\/$/, '') === AUTH_BASE()) return true;
  return new RegExp(`^https://accounts\\.zoho\\.${ZOHO_TLDS}$`).test(u.replace(/\/$/, ''));
}
function allowedApiDomain(u: string): boolean {
  if (process.env.ZOHO_API_DOMAIN && u.replace(/\/$/, '') === process.env.ZOHO_API_DOMAIN.replace(/\/$/, '')) return true;
  return new RegExp(`^https://www\\.zohoapis\\.${ZOHO_TLDS}$`).test(u.replace(/\/$/, ''));
}

export function authUrl(state: string) {
  const q = new URLSearchParams({
    scope: SCOPES.join(','), client_id: process.env.ZOHO_CLIENT_ID!, response_type: 'code',
    access_type: 'offline', prompt: 'consent', redirect_uri: redirectUri(), state
  });
  return `${AUTH_BASE()}/oauth/v2/auth?${q}`;
}

async function tokenCall(server: string, params: Record<string, string>) {
  const r = await fetch(`${server.replace(/\/$/, '')}/oauth/v2/token`, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: process.env.ZOHO_CLIENT_ID!, client_secret: process.env.ZOHO_CLIENT_SECRET!, ...params })
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error || !j.access_token) throw new Error(`Zoho token error: ${j.error || r.status}`);
  return j as { access_token: string; refresh_token?: string; expires_in: number; api_domain?: string };
}

/** Finishes the OAuth flow: stores encrypted tokens and picks the default organisation. */
export async function connect(companyId: string, userId: string, code: string, accountsServer: string) {
  if (!allowedAccountsServer(accountsServer)) throw new Error('Unexpected Zoho accounts server');
  const t = await tokenCall(accountsServer, { grant_type: 'authorization_code', code, redirect_uri: redirectUri() });
  if (!t.refresh_token) throw new Error('Zoho did not return a refresh token');
  const apiDomain = (t.api_domain || 'https://www.zohoapis.com').replace(/\/$/, '');
  if (!allowedApiDomain(apiDomain)) throw new Error('Unexpected Zoho API domain');
  const orgs = await get(apiDomain, t.access_token, '/books/v3/organizations', {});
  const list = (orgs.organizations || []) as { organization_id: string; name: string; is_default_org?: boolean }[];
  const org = list.find((o) => o.is_default_org) || list[0];
  if (!org) throw new Error('No Zoho Books organisation found on this account');
  await sql`insert into zoho_connections (company_id, accounts_server, api_domain, refresh_token_enc, access_token_enc, access_expires_at, org_id, org_name, connected_by)
    values (${companyId}, ${accountsServer}, ${apiDomain}, ${encrypt(t.refresh_token)}, ${encrypt(t.access_token)}, ${new Date(Date.now() + (t.expires_in - 60) * 1000)}, ${org.organization_id}, ${org.name}, ${userId})
    on conflict (company_id) do update set accounts_server = excluded.accounts_server, api_domain = excluded.api_domain, refresh_token_enc = excluded.refresh_token_enc,
      access_token_enc = excluded.access_token_enc, access_expires_at = excluded.access_expires_at, org_id = excluded.org_id, org_name = excluded.org_name,
      connected_by = excluded.connected_by, connected_at = now(), last_error = null`;
  await audit(userId, companyId, 'zoho_connected', { org: org.name });
  return org.name;
}

export async function disconnect(companyId: string, userId: string) {
  const [c] = await sql`select accounts_server, refresh_token_enc from zoho_connections where company_id = ${companyId}`;
  if (!c) return;
  try { await fetch(`${c.accounts_server}/oauth/v2/token/revoke?token=${encodeURIComponent(decrypt(c.refresh_token_enc))}`, { method: 'POST' }); } catch { /* best effort */ }
  await sql`delete from zoho_connections where company_id = ${companyId}`;
  await audit(userId, companyId, 'zoho_disconnected');
}

export async function status(companyId: string) {
  const [c] = await sql`select org_name, connected_at, last_sync_at, last_result, last_error from zoho_connections where company_id = ${companyId}`;
  return { configured: zohoConfigured(), connected: !!c, org: c?.org_name ?? null, lastSyncAt: c?.last_sync_at ?? null, lastResult: c?.last_result ?? null, lastError: c?.last_error ?? null };
}

/* ---------- API calls ---------- */
async function get(apiDomain: string, token: string, path: string, params: Record<string, string>) {
  const r = await fetch(`${apiDomain}${path}?${new URLSearchParams(params)}`, { headers: { Authorization: `Zoho-oauthtoken ${token}` } });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || (typeof j.code === 'number' && j.code !== 0)) throw new Error(`Zoho ${path}: ${j.message || r.status}`);
  return j;
}

type Conn = { company_id: string; accounts_server: string; api_domain: string; refresh_token_enc: string; access_token_enc: string | null; access_expires_at: Date | null; org_id: string };

async function accessToken(c: Conn) {
  if (c.access_token_enc && c.access_expires_at && new Date(c.access_expires_at) > new Date()) return decrypt(c.access_token_enc);
  const t = await tokenCall(c.accounts_server, { grant_type: 'refresh_token', refresh_token: decrypt(c.refresh_token_enc) });
  await sql`update zoho_connections set access_token_enc = ${encrypt(t.access_token)}, access_expires_at = ${new Date(Date.now() + (t.expires_in - 60) * 1000)} where company_id = ${c.company_id}`;
  return t.access_token;
}

/** Reads every page of a list endpoint (200 per page, capped). */
async function listAll(c: Conn, token: string, path: string, key: string, params: Record<string, string>, maxPages = 10) {
  const out: any[] = [];
  for (let page = 1; page <= maxPages; page++) {
    const j = await get(c.api_domain, token, path, { organization_id: c.org_id, per_page: '200', page: String(page), ...params });
    out.push(...(j[key] || []));
    if (!j.page_context?.has_more_page) break;
  }
  return out;
}

const num = (v: unknown) => (typeof v === 'number' ? v : parseFloat(String(v ?? '0')) || 0);
const day = (s: unknown) => (typeof s === 'string' && /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : null);
const mkey = (d: Date) => d.toISOString().slice(0, 7);

/** Pulls unpaid invoices, unpaid bills, bank balances and six months of sales and spend into the company's plan. */
export async function sync(companyId: string, userId: string | null) {
  const [c] = await sql<Conn[]>`select * from zoho_connections where company_id = ${companyId}`;
  if (!c) throw new Error('Zoho Books is not connected');
  const notes: string[] = [];
  try {
    const token = await accessToken(c);
    const uniq = (rows: any[], id: string) => [...new Map(rows.map((r) => [r[id], r])).values()];

    // Receivables and payables: open documents with a balance left.
    const inv = uniq((await Promise.all(['unpaid', 'overdue', 'partially_paid'].map((s) => listAll(c, token, '/books/v3/invoices', 'invoices', { status: s })))).flat(), 'invoice_id')
      .filter((i) => num(i.balance) > 0 && !['void', 'draft'].includes(i.status));
    const bills = uniq((await Promise.all(['open', 'overdue', 'partially_paid'].map((s) => listAll(c, token, '/books/v3/bills', 'bills', { status: s })))).flat(), 'bill_id')
      .filter((b) => num(b.balance) > 0 && !['void', 'draft', 'paid'].includes(b.status));

    // Bank balance: active bank and cash accounts, not credit cards.
    let cash: number | null = null;
    try {
      const accts = await listAll(c, token, '/books/v3/bankaccounts', 'bankaccounts', {}, 2);
      const banks = accts.filter((a) => a.is_active !== false && a.account_type !== 'credit_card');
      if (banks.length) cash = banks.reduce((s, a) => s + num(a.bcy_balance ?? a.balance), 0);
    } catch (e: any) { notes.push('bank balance not read'); console.error(e?.message); }

    // Last six full months of sales (invoices) and spend (bills + expenses).
    const now = new Date(), start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 6, 1)), end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0));
    const range = { date_start: start.toISOString().slice(0, 10), date_end: end.toISOString().slice(0, 10) };
    const months: Record<string, { rev: number; spend: number }> = {};
    for (let i = 6; i >= 1; i--) months[mkey(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1)))] = { rev: 0, spend: 0 };
    const add = (d: unknown, k: 'rev' | 'spend', v: number) => { const s = day(d); if (s && months[s.slice(0, 7)]) months[s.slice(0, 7)][k] += v; };
    for (const i of await listAll(c, token, '/books/v3/invoices', 'invoices', range)) if (!['void', 'draft'].includes(i.status)) add(i.date, 'rev', num(i.total));
    for (const b of await listAll(c, token, '/books/v3/bills', 'bills', range)) if (!['void', 'draft'].includes(b.status)) add(b.date, 'spend', num(b.total));
    try { for (const e of await listAll(c, token, '/books/v3/expenses', 'expenses', range)) add(e.date, 'spend', num(e.total ?? e.amount)); }
    catch (e: any) { notes.push('expenses not read'); console.error(e?.message); }

    // Merge into the saved plan. Manually entered rows stay; Zoho rows are replaced.
    const result = await sql.begin(async (tx) => {
      const [row] = await tx`select data from company_state where company_id = ${companyId} for update`;
      const st: any = row?.data;
      if (!st?.profile) return { skipped: 'Finish onboarding first, then sync.' };
      st.recv = [...(st.recv || []).filter((r: any) => r.source !== 'zoho'),
        ...inv.map((i) => ({ id: `zoho-inv-${i.invoice_id}`, who: `${i.customer_name || 'Customer'}${i.invoice_number ? ' · ' + i.invoice_number : ''}`, amt: num(i.balance), due: day(i.due_date) || day(i.date) || now.toISOString().slice(0, 10), source: 'zoho' }))];
      st.pay = [...(st.pay || []).filter((r: any) => r.source !== 'zoho'),
        ...bills.map((b) => ({ id: `zoho-bill-${b.bill_id}`, who: `${b.vendor_name || 'Supplier'}${b.bill_number ? ' · ' + b.bill_number : ''}`, amt: num(b.balance), due: day(b.due_date) || day(b.date) || now.toISOString().slice(0, 10), source: 'zoho' }))];
      const hist = new Map<string, any>((st.history || []).map((h: any) => [h.m, h]));
      for (const [m, v] of Object.entries(months)) {
        if (!v.rev && !v.spend) continue;
        const prev = hist.get(m) || {};
        hist.set(m, { ...prev, m, rev: Math.round(v.rev), spend: Math.round(v.spend), cash: prev.cash ?? null, source: 'zoho' });
      }
      st.history = [...hist.values()].sort((a, b) => (a.m < b.m ? -1 : 1));
      const recent = Object.values(months).slice(-3).filter((v) => v.rev || v.spend);
      if (recent.length) {
        st.profile.rev = Math.round(recent.reduce((s, v) => s + v.rev, 0) / recent.length);
        st.profile.spend = Math.round(recent.reduce((s, v) => s + v.spend, 0) / recent.length);
      }
      if (cash !== null) {
        st.profile.cash = Math.round(cash);
        const last = st.history.at(-1); if (last && last.cash == null) last.cash = Math.round(cash);
      }
      await tx`update company_state set data = ${tx.json(st)}, version = version + 1, updated_by = ${userId}, updated_at = now() where company_id = ${companyId}`;
      return { invoices: inv.length, bills: bills.length, cash, months: Object.values(months).filter((v) => v.rev || v.spend).length, notes };
    });
    await sql`update zoho_connections set last_sync_at = now(), last_result = ${sql.json(result as any)}, last_error = null where company_id = ${companyId}`;
    await audit(userId, companyId, 'zoho_synced', result);
    return result;
  } catch (e: any) {
    const msg = String(e?.message || e).slice(0, 300);
    await sql`update zoho_connections set last_error = ${msg} where company_id = ${companyId}`;
    throw new Error(msg.startsWith('Zoho token error') ? 'Zoho Books access has expired or was removed. Connect it again.' : `Zoho Books sync failed: ${msg}`);
  }
}
