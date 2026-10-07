import { redirect } from 'next/navigation';
import Script from 'next/script';
import { context } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Growth Planner' };

export default async function PlannerPage() {
  const ctx = await context();
  if (!ctx) redirect('/login');
  const boot = JSON.stringify({ role: ctx.role, user: { name: ctx.user.name, email: ctx.user.email } }).replace(/</g, '\\u003c');
  return (
    <>
      <link rel="stylesheet" href="/planner.css" precedence="default" />
      <div id="app" />
      <div id="layer" />
      <script dangerouslySetInnerHTML={{ __html: `window.__GP__=${boot};` }} />
      <Script src="/planner.js" strategy="afterInteractive" />
    </>
  );
}
