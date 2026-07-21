import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/common/app-shell';
import type { NavItem } from '@/components/common/nav-list';
import { getMyCarrier } from '@/features/carriers/api';
import { initialsFor } from '@/lib/initials';
import { parseSessionCookie, SESSION_COOKIE } from '@/lib/session';
import { ApiError } from '@/services/api-client';

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
  const cookieStore = await cookies();
  const session = parseSessionCookie(cookieStore.get(SESSION_COOKIE)?.value);

  if (
    !session ||
    (session.role !== 'CARRIER_MANAGER' && session.role !== 'CARRIER_OPERATOR')
  ) {
    redirect('/login');
  }

  let carrier: Awaited<ReturnType<typeof getMyCarrier>>;
  try {
    carrier = await getMyCarrier(session.token);
  } catch (error) {
    if (error instanceof ApiError) {
      redirect('/login');
    }
    throw error;
  }

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
