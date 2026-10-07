# Growth Planner

A weekly co-pilot for first-time Indian founders: this week's three moves, a 13-week cash forecast with what-if tests, an AI advisor that reads the company's own numbers, an India compliance calendar, and team tasks.

Built with Next.js 15 and Postgres. Deploys to Vercel.

## What works today

- Sign up, sign in, sign out, password reset, two-step sign-in (authenticator app)
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

## Deploy to Vercel

1. Import this repository in Vercel (framework: Next.js).
2. Add a database: Vercel dashboard → Storage → Create → Neon (Postgres). Connect it to the project; it sets `DATABASE_URL`.
3. Add environment variables (Settings → Environment Variables):
   - `CRON_SECRET`: a long random string (`openssl rand -hex 32`)
   - `APP_URL`: your production URL, e.g. `https://growth-planner.vercel.app`
   - Optional: `ANTHROPIC_API_KEY` (advisor), `RESEND_API_KEY` and `EMAIL_FROM` (emails)
4. Redeploy. Sign up at `/signup`.

The cron in `vercel.json` calls `/api/cron/reminders` daily; it sends nothing unless email is configured.

## Environment variables

| Name | Required | What it does |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Postgres connection string |
| `CRON_SECRET` | Yes | Protects the reminder cron endpoint |
| `APP_URL` | Yes in production | Links in emails |
| `ANTHROPIC_API_KEY` | For the advisor | Server-side key; never sent to browsers |
| `ANTHROPIC_MODEL` | No | Defaults to `claude-sonnet-5-5` |
| `ADVISOR_MONTHLY_LIMIT` | No | Questions per company per month (default 50) |
| `RESEND_API_KEY`, `EMAIL_FROM` | For email | Password reset, invites, reminders |

## Layout

```
app/            pages (login, signup, settings, legal) and API routes under app/api
lib/            database, auth, crypto (scrypt, TOTP), email, reminder digest
public/         planner.js and planner.css: the planner UI
```

## Security notes

- Passwords are hashed with scrypt; session cookies are httpOnly, SameSite=Lax, 30 days
- Sign-in is rate limited (8 failures per 15 minutes per email)
- Writes are rejected from other origins; a Content-Security-Policy and other security headers are set in `next.config.mjs`
- Audit log records sign-ins, password changes, exports, invites and deletions
