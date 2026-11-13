import {
  LayoutDashboardIcon,
  RadarIcon,
  StoreIcon,
  TruckIcon,
} from 'lucide-react';
import { AppShell } from '@/components/common/app-shell';
import type { NavSection } from '@/components/common/nav-tree';
import { AdminOpsStatus } from '@/features/admin/components/admin-ops-status';
import { GlobalBanner } from '@/features/demo/components/global-banner';
import { AdminNavCounts } from '@/features/shipments/components/nav-counts-provider';
import { requireSegment } from '@/lib/server-session';

const ADMIN_NAV: NavSection[] = [
  {
    items: [
      {
        name: 'Overview',
        href: '/admin',
        icon: <LayoutDashboardIcon />,
        shortcut: 'o',
        tab: true,
      },
      {
        name: 'Monitoring',
        href: '/admin/monitoring',
        owns: ['/admin/shipments'],
        icon: <RadarIcon />,
        shortcut: 'm',
        tab: true,
        defaultView: 'active',
        views: [
          {
            name: 'Active',
            param: 'view',
            value: 'active',
            countKey: 'active',
          },
          { name: 'Late', param: 'view', value: 'late', countKey: 'late' },
          {
            name: 'Exceptions',
            param: 'view',
            value: 'exceptions',
            countKey: 'exceptions',
          },
        ],
      },
    ],
  },
  {
    label: 'Tenants',
    items: [
      {
        name: 'Sellers',
        href: '/admin/sellers',
        icon: <StoreIcon />,
        tab: true,
      },
      { name: 'Carriers', href: '/admin/carriers', icon: <TruckIcon /> },
    ],
  },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSegment('admin');

  return (
    <AdminNavCounts>
      <AppShell
        banner={<GlobalBanner />}
        sidebarFooter={<AdminOpsStatus />}
        nav={ADMIN_NAV}
        user={{ name: session.email, role: 'Administrator', initials: 'AD' }}
      >
        {children}
      </AppShell>
    </AdminNavCounts>
  );
}
