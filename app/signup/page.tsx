import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { emailConfigured } from '@/lib/email';
import { googleConfigured } from '@/lib/signin';
import AuthShell from '@/components/AuthShell';
import AuthForm from '@/components/AuthForm';
export const dynamic = 'force-dynamic';
export default async function Page({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  if (await currentUser()) redirect('/app');
  const { email } = await searchParams;
  const emailCodes = emailConfigured() || process.env.NODE_ENV !== 'production';
  return <AuthShell><AuthForm mode="signup" google={googleConfigured()} emailCodes={emailCodes} email={typeof email === 'string' ? email : ''} /></AuthShell>;
}
