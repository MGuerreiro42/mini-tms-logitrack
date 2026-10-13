import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/server-session';
import { ROLE_HOME } from '@/lib/session';

export default async function Home() {
  const session = await getServerSession();

  redirect(session ? ROLE_HOME[session.role] : '/login');
}
