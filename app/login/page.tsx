import { redirect } from 'next/navigation';
import { currentUser, pendingUserId } from '@/lib/auth';
import { emailConfigured } from '@/lib/email';
import { googleConfigured } from '@/lib/signin';
import AuthShell from '@/components/AuthShell';
import AuthForm from '@/components/AuthForm';
export const dynamic = 'force-dynamic';
export default async function Page({ searchParams }: { searchParams: Promise<{ step?: string; error?: string }> }) {
  if (await currentUser()) redirect('/app');
  const q = await searchParams;
  const start2fa = q.step === '2fa' && !!(await pendingUserId());
  const emailCodes = emailConfigured() || process.env.NODE_ENV !== 'production';
  return <AuthShell><AuthForm mode="login" google={googleConfigured()} emailCodes={emailCodes} start2fa={start2fa} error={q.error} /></AuthShell>;
}
