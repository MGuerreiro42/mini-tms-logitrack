import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { parseSessionCookie, SESSION_COOKIE } from '@/lib/session';

export default async function Home() {
  const cookieStore = await cookies();
  const session = parseSessionCookie(cookieStore.get(SESSION_COOKIE)?.value);

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
