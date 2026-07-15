import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/common/app-shell';
import type { NavItem } from '@/components/common/nav-list';
import { parseSessionCookie, SESSION_COOKIE } from '@/lib/session';

const ADMIN_NAV: NavItem[] = [
  { name: 'Sellers', href: '/admin/sellers' },
  { name: 'Carriers', href: '/admin/carriers' },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const session = parseSessionCookie(cookieStore.get(SESSION_COOKIE)?.value);

  // Real gate, not just middleware's coarse cookie check — this is the one
  // that actually matters, since it's a Server Component reading the same
  // signed session middleware already validated the shape of.
  if (!session || session.role !== 'ADMIN') {
    redirect('/login');
  }

  return (
    <AppShell
      navGroupLabel="Admin"
      navItems={ADMIN_NAV}
      user={{ name: session.email, role: 'Administrator', initials: 'AD' }}
    >
      {children}
    </AppShell>
  );
}
