import { redirect } from 'next/navigation';
import { AppShell } from '@/components/common/app-shell';
import type { NavItem } from '@/components/common/nav-list';
import { getMyCarrier } from '@/features/carriers/api';
import { initialsFor } from '@/lib/initials';
import { requireRole, withAuthRedirects } from '@/lib/server-session';

const CARRIER_NAV: NavItem[] = [
  { name: 'Company', href: '/carrier' },
  { name: 'Shipment queue', href: '/carrier/queue' },
  { name: 'Modalities & Coverage', href: '/carrier/settings' },
  { name: 'Performance', href: '/carrier/performance' },
];

export default async function CarrierLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireRole('CARRIER_MANAGER', 'CARRIER_OPERATOR');
  const carrier = await withAuthRedirects(getMyCarrier(session.token));

  if (carrier.status !== 'APPROVED') {
    redirect('/status');
  }

  const roleLabel = session.role === 'CARRIER_MANAGER' ? 'Manager' : 'Operator';

  return (
    <AppShell
      navGroupLabel="Carrier"
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
