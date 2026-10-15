import { AppShell } from '@/components/common/app-shell';
import type { NavItem } from '@/components/common/nav-list';
import { requireSegment } from '@/lib/server-session';

const ADMIN_NAV: NavItem[] = [
  { name: 'Overview', href: '/admin' },
  { name: 'Sellers', href: '/admin/sellers' },
  { name: 'Carriers', href: '/admin/carriers' },
  { name: 'Monitoring', href: '/admin/monitoring' },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSegment('admin');

  return (
    <AppShell
      navItems={ADMIN_NAV}
      user={{ name: session.email, role: 'Administrator', initials: 'AD' }}
    >
      {children}
    </AppShell>
  );
}
