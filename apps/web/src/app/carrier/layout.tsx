import {
  Building2Icon,
  GaugeIcon,
  InboxIcon,
  MapPinnedIcon,
} from 'lucide-react';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/common/app-shell';
import type { NavSection } from '@/components/common/nav-tree';
import { getMyCarrier } from '@/features/carriers/api';
import { GlobalBanner } from '@/features/demo/components/global-banner';
import { CarrierNavCounts } from '@/features/shipments/components/nav-counts-provider';
import { initialsFor } from '@/lib/initials';
import { ROUTES } from '@/lib/routes';
import { requireSegment, withAuthRedirects } from '@/lib/server-session';

const QUEUE_VIEWS = [
  { name: 'Unclaimed', value: 'unclaimed', counted: true },
  { name: 'Mine', value: 'mine', counted: true },
  { name: 'To pick up', value: 'to_pick_up', counted: true },
  { name: 'On the road', value: 'on_the_road', counted: true },
  { name: 'Exceptions', value: 'exceptions', counted: true },
  { name: 'Done', value: 'done', counted: false },
].map(({ name, value, counted }) => ({
  name,
  param: 'view' as const,
  value,
  countKey: counted ? value : undefined,
}));

// The queue page picks the same default view per role.
function carrierNav(defaultView: string): NavSection[] {
  return [
    {
      items: [
        {
          name: 'Queue',
          href: '/carrier/queue',
          icon: <InboxIcon />,
          shortcut: 'q',
          tab: true,
          views: QUEUE_VIEWS,
          defaultView,
        },
        {
          name: 'Performance',
          shortName: 'Metrics',
          href: '/carrier/performance',
          icon: <GaugeIcon />,
          shortcut: 'p',
          tab: true,
        },
      ],
    },
    {
      label: 'Company',
      items: [
        {
          name: 'Company',
          href: '/carrier/company',
          icon: <Building2Icon />,
          tab: true,
        },
        {
          name: 'Modalities & coverage',
          shortName: 'Coverage',
          href: '/carrier/settings',
          icon: <MapPinnedIcon />,
        },
      ],
    },
  ];
}

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

  const isManager = session.role === 'CARRIER_MANAGER';

  return (
    <CarrierNavCounts>
      <AppShell
        banner={<GlobalBanner />}
        nav={carrierNav(isManager ? 'unclaimed' : 'mine')}
        user={{
          name: carrier.companyName,
          role: isManager ? 'Manager' : 'Operator',
          initials: initialsFor(carrier.companyName),
        }}
      >
        {children}
      </AppShell>
    </CarrierNavCounts>
  );
}
