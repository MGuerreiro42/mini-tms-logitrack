import { redirect } from 'next/navigation';
import { AppShell } from '@/components/common/app-shell';
import type { NavItem } from '@/components/common/nav-list';
import { getMySeller } from '@/features/sellers/api';
import { initialsFor } from '@/lib/initials';
import { getServerSession } from '@/lib/server-session';
import { ApiError } from '@/services/api-client';

const SELLER_NAV: NavItem[] = [
  { name: 'Dashboard', href: '/seller' },
  { name: 'Profile', href: '/seller/profile' },
  { name: 'Modalities', href: '/seller/modalities' },
  { name: 'Create shipment', href: '/seller/shipments/new' },
  { name: 'Shipments', href: '/seller/shipments' },
];

export default async function SellerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();

  if (!session || session.role !== 'SELLER') {
    redirect('/login');
  }

  // Only APPROVED sellers reach the dashboard, re-checked against the API on every request.
  let seller: Awaited<ReturnType<typeof getMySeller>>;
  try {
    seller = await getMySeller(session.token);
  } catch (error) {
    // A stale or tampered cookie gets 401/403; send it to login instead of a 500.
    if (error instanceof ApiError) {
      redirect('/login');
    }
    throw error;
  }

  if (seller.status !== 'APPROVED') {
    redirect('/status');
  }

  return (
    <AppShell
      navGroupLabel="Seller"
      navItems={SELLER_NAV}
      user={{
        name: seller.companyName,
        role: 'Seller',
        initials: initialsFor(seller.companyName),
      }}
    >
      {children}
    </AppShell>
  );
}
