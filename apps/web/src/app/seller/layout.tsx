import { redirect } from 'next/navigation';
import { AppShell } from '@/components/common/app-shell';
import type { NavItem } from '@/components/common/nav-list';
import { getMySeller } from '@/features/sellers/api';
import { initialsFor } from '@/lib/initials';
import { ROUTES } from '@/lib/routes';
import { requireSegment, withAuthRedirects } from '@/lib/server-session';

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
  const session = await requireSegment('seller');
  const seller = await withAuthRedirects(getMySeller(session.token));

  if (seller.status !== 'APPROVED') {
    redirect(ROUTES.status);
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
