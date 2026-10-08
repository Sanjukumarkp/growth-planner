# Growth Planner

A weekly co-pilot for first-time Indian founders: this week's three moves, a 13-week cash forecast with what-if tests, an AI advisor that reads the company's own numbers, an India compliance calendar, and team tasks.

Built with Next.js 15 and Postgres. Deploys to Vercel.

## What works today

- Sign in with an emailed 6-digit code, with Google, or with a password; password reset; two-step sign-in (authenticator app)
- One company per account, shared with invited teammates (owner and member roles)
- The full planner: onboarding (including the no-sales path), This week, Cash, Advisor, Plan, Compliance, Team
- Plans are saved on the server, with conflict detection if two people edit at once
- Bank statement import (CSV) when closing a month. The file is parsed in the browser and only monthly totals are saved
- AI advisor through the Anthropic API, with a monthly question limit per company
- Monday and month-close reminder emails (daily cron at 09:00 IST)
- Data export (JSON) and account deletion
- Draft privacy policy and terms (have a lawyer review them before launch)

Not built yet: Zoho Books sync, Razorpay billing, WhatsApp reminders, CA multi-client view.

## Run locally

```bash
npm install
cp .env.example .env.local     # set DATABASE_URL at minimum
npm run dev                    # http://localhost:3000
```

Tables are created automatically on the first request. To create them ahead of time: `npm run db:migrate`.

## Deploy (hosted in India)

The app runs in Vercel's Mumbai region (`bom1`, set in `vercel.json`) and the database in Supabase's Mumbai region (`ap-south-1`), so data and servers stay in India.

1. **Database:** create a Supabase project and pick the region **South Asia (Mumbai)**. In Project Settings → Database → Connection string, copy the **Transaction pooler** URI (port 6543) and put your database password in it. That is your `DATABASE_URL`.
2. **App:** import this repository in Vercel (framework: Next.js). Functions run in Mumbai automatically.
3. **Environment variables** (Vercel → Settings → Environment Variables):
   - `DATABASE_URL` from step 1
   - `CRON_SECRET`: a long random string (`openssl rand -hex 32`)
   - `APP_URL`: your production URL, e.g. `https://growth-planner.vercel.app`
   - `RESEND_API_KEY` and `EMAIL_FROM`: needed for email sign-in codes, password reset, invites and reminders
   - `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`: for Google sign-in (below)
   - `ANTHROPIC_API_KEY`: for the advisor
4. Redeploy and open `/signup`.

Tables are created on the first request. The cron in `vercel.json` sends reminders at 09:00 IST when email is set up.

### Google sign-in

1. In [Google Cloud Console](https://console.cloud.google.com/), create a project, then APIs & Services → OAuth consent screen (External; app name, support email, your privacy and terms URLs).
2. Credentials → Create credentials → OAuth client ID → Web application.
3. Authorised redirect URI: `https://<your domain>/api/auth/google/callback` (add `http://localhost:3000/api/auth/google/callback` for local testing).
4. Copy the client ID and secret into `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.

A Google account is linked to an existing Growth Planner account with the same verified email.

### Email sign-in codes

Codes are 6 digits, valid for 10 minutes, at most 5 tries per code and 5 codes per email per hour. Without email configured, production hides this option; in development the code is shown on screen.

## Environment variables

| Name | Required | What it does |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Postgres connection string |
| `CRON_SECRET` | Yes | Protects the reminder cron endpoint |
| `APP_URL` | Yes in production | Links in emails |
| `ANTHROPIC_API_KEY` | For the advisor | Server-side key; never sent to browsers |
| `ANTHROPIC_MODEL` | No | Defaults to `claude-sonnet-5-5` |
| `ADVISOR_MONTHLY_LIMIT` | No | Questions per company per month (default 50) |
| `RESEND_API_KEY`, `EMAIL_FROM` | For email | Sign-in codes, password reset, invites, reminders |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | For Google sign-in | OAuth web client |

## Layout

```
app/            pages (login, signup, settings, legal) and API routes under app/api
lib/            database, auth, crypto (scrypt, TOTP), email, reminder digest
public/         planner.js and planner.css: the planner UI
```

## Security notes

- Passwords are hashed with scrypt; email codes are stored hashed and expire after 10 minutes; session cookies are httpOnly, SameSite=Lax, 30 days
- Sign-in is rate limited (8 failures per 15 minutes per email)
- Writes are rejected from other origins; a Content-Security-Policy and other security headers are set in `next.config.mjs`
- Audit log records sign-ins, password changes, exports, invites and deletions
