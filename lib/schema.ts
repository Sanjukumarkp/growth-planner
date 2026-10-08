// Database schema. Runs automatically on first request; safe to run repeatedly.
export const SCHEMA = `
-- Growth Planner schema. Safe to run repeatedly.
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text not null default '',
  password_hash text not null,
  totp_secret text,
  totp_enabled boolean not null default false,
  terms_accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists sessions (
  id text primary key,               -- sha256 of the cookie token
  user_id uuid not null references users(id) on delete cascade,
  pending_2fa boolean not null default false,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists sessions_user_idx on sessions(user_id);

create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'My startup',
  created_at timestamptz not null default now()
);

create table if not exists memberships (
  company_id uuid not null references companies(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','member')),
  created_at timestamptz not null default now(),
  primary key (company_id, user_id)
);

create table if not exists invites (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  email text not null,
  invited_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  accepted_at timestamptz
);
create index if not exists invites_email_idx on invites(email);

create table if not exists company_state (
  company_id uuid primary key references companies(id) on delete cascade,
  data jsonb,
  version integer not null default 0,
  updated_by uuid references users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists password_resets (
  token_hash text primary key,
  user_id uuid not null references users(id) on delete cascade,
  expires_at timestamptz not null,
  used_at timestamptz
);

create table if not exists login_attempts (
  id bigserial primary key,
  email text not null,
  ok boolean not null,
  at timestamptz not null default now()
);
create index if not exists login_attempts_email_idx on login_attempts(email, at);

create table if not exists advisor_usage (
  company_id uuid not null references companies(id) on delete cascade,
  month text not null,
  count integer not null default 0,
  primary key (company_id, month)
);

create table if not exists reminder_log (
  company_id uuid not null references companies(id) on delete cascade,
  kind text not null,
  period text not null,
  sent_at timestamptz not null default now(),
  primary key (company_id, kind, period)
);

create table if not exists audit_log (
  id bigserial primary key,
  user_id uuid,
  company_id uuid,
  action text not null,
  meta jsonb,
  at timestamptz not null default now()
);
create index if not exists audit_company_idx on audit_log(company_id, at);

-- Passwordless sign-in (email code, Google)
alter table users alter column password_hash drop not null;
alter table users add column if not exists google_sub text unique;

create table if not exists login_codes (
  id bigserial primary key,
  email text not null,
  code_hash text not null,
  attempts integer not null default 0,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists login_codes_email_idx on login_codes(email, created_at);
`;
