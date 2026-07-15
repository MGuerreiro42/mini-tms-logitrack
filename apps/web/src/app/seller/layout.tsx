import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/common/app-shell';
import type { NavItem } from '@/components/common/nav-list';
import { getMySeller } from '@/features/sellers/api';
import { initialsFor } from '@/lib/initials';
import { parseSessionCookie, SESSION_COOKIE } from '@/lib/session';
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
  const cookieStore = await cookies();
  const session = parseSessionCookie(cookieStore.get(SESSION_COOKIE)?.value);

  if (!session || session.role !== 'SELLER') {
    redirect('/login');
  }

  // Real approval check — a SELLER role alone isn't enough to reach the
  // dashboard, only an APPROVED one is. Every request re-derives this from
  // the backend rather than trusting anything cached client-side.
  let seller: Awaited<ReturnType<typeof getMySeller>>;
  try {
    seller = await getMySeller(session.token);
  } catch (error) {
    // A stale/tampered cookie (e.g. role doesn't match the real signed JWT)
    // gets a 401/403 from the backend — the backend already rejected it for
    // real, this just avoids a raw 500 error page for that case.
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
