import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import Settings from './Settings';
export const dynamic = 'force-dynamic';
export default async function Page() {
  if (!(await currentUser())) redirect('/login');
  return <Settings />;
}
