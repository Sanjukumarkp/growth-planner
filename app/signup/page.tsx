import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import AuthShell from '@/components/AuthShell';
import SignupForm from './SignupForm';
export const dynamic = 'force-dynamic';
export default async function Page({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  if (await currentUser()) redirect('/app');
  const { email } = await searchParams;
  return <AuthShell><SignupForm email={typeof email === 'string' ? email : ''} /></AuthShell>;
}
