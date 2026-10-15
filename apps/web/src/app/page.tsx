import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/server-session';

export default async function Home() {
  const session = await getServerSession();

  if (!session) {
    redirect('/login');
  }

  switch (session.role) {
    case 'ADMIN':
      return redirect('/admin');
    case 'SELLER':
      return redirect('/seller');
    case 'CARRIER_MANAGER':
    case 'CARRIER_OPERATOR':
      return redirect('/carrier');
  }
}
