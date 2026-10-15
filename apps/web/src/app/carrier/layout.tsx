import { redirect } from 'next/navigation';
import { AppShell } from '@/components/common/app-shell';
import type { NavItem } from '@/components/common/nav-list';
import { getMyCarrier } from '@/features/carriers/api';
import { initialsFor } from '@/lib/initials';
import { ROUTES } from '@/lib/routes';
import { requireSegment, withAuthRedirects } from '@/lib/server-session';

const CARRIER_NAV: NavItem[] = [
  { name: 'Shipment queue', shortName: 'Queue', href: '/carrier/queue' },
  { name: 'Performance', href: '/carrier/performance' },
  { name: 'Company', href: '/carrier/company' },
  {
    name: 'Modalities & coverage',
    shortName: 'Coverage',
    href: '/carrier/settings',
  },
];

export default async function CarrierLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSegment('carrier');
  const carrier = await withAuthRedirects(getMyCarrier(session.token));

  if (carrier.status !== 'APPROVED') {
    redirect(ROUTES.status);
  }

  const roleLabel = session.role === 'CARRIER_MANAGER' ? 'Manager' : 'Operator';

  return (
    <AppShell
      navItems={CARRIER_NAV}
      user={{
        name: carrier.companyName,
        role: roleLabel,
        initials: initialsFor(carrier.companyName),
      }}
    >
      {children}
    </AppShell>
  );
}
