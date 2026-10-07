import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import AuthShell from '@/components/AuthShell';
import LoginForm from './LoginForm';
export const dynamic = 'force-dynamic';
export default async function Page() {
  if (await currentUser()) redirect('/app');
  return <AuthShell><LoginForm /></AuthShell>;
}
