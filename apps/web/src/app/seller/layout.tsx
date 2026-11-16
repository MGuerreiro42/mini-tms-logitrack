import {
  LayoutDashboardIcon,
  PackageIcon,
  PlugIcon,
  PlusIcon,
  SlidersHorizontalIcon,
  UserRoundIcon,
} from 'lucide-react';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/common/app-shell';
import type { NavSection } from '@/components/common/nav-tree';
import { ChaosStatusRow } from '@/features/demo/components/chaos-status-row';
import { GlobalBanner } from '@/features/demo/components/global-banner';
import { getMySeller } from '@/features/sellers/api';
import { SellerNavCounts } from '@/features/shipments/components/nav-counts-provider';
import { initialsFor } from '@/lib/initials';
import { ROUTES } from '@/lib/routes';
import { requireSegment, withAuthRedirects } from '@/lib/server-session';

const SELLER_NAV: NavSection[] = [
  {
    items: [
      {
        name: 'Overview',
        href: ROUTES.seller,
        icon: <LayoutDashboardIcon />,
        shortcut: 'o',
        tab: true,
      },
      {
        name: 'Shipments',
        href: ROUTES.sellerShipments,
        icon: <PackageIcon />,
        shortcut: 's',
        tab: true,
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
          { name: 'Delivered', param: 'status', value: 'DELIVERED' },
          { name: 'Cancelled', param: 'status', value: 'CANCELLED' },
        ],
      },
      {
        name: 'Create shipment',
        shortName: 'Create',
        href: ROUTES.newShipment,
        icon: <PlusIcon />,
        shortcut: 'c',
        tab: true,
        primary: true,
      },
    ],
  },
  {
    label: 'Setup',
    items: [
      {
        name: 'Modalities',
        href: ROUTES.sellerModalities,
        icon: <SlidersHorizontalIcon />,
      },
      {
        name: 'Integrations',
        href: ROUTES.sellerIntegrations,
        icon: <PlugIcon />,
      },
      { name: 'Profile', href: ROUTES.sellerProfile, icon: <UserRoundIcon /> },
    ],
  },
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
    <SellerNavCounts>
      <AppShell
        banner={<GlobalBanner />}
        sidebarFooter={<ChaosStatusRow />}
        nav={SELLER_NAV}
        user={{
          name: seller.companyName,
          role: 'Seller',
          initials: initialsFor(seller.companyName),
        }}
      >
        {children}
      </AppShell>
    </SellerNavCounts>
  );
}
