import { cookies } from 'next/headers';
import { CommandMenu } from '@/components/common/command-menu';
import { NavList } from '@/components/common/nav-list';
import {
  type NavSection,
  SIDEBAR_COOKIE,
  SIDEBAR_NAV_ID,
} from '@/components/common/nav-tree';
import { PageTransition } from '@/components/common/page-transition';
import { SessionSync } from '@/components/common/session-sync';
import { SidebarFrame } from '@/components/common/sidebar-frame';
import { UserMenu } from '@/components/common/user-menu';
import { Toaster } from '@/components/ui/sonner';

interface AppShellProps {
  nav: NavSection[];
  user: { name: string; role: string; initials: string };
  // Full width between the header and the page; each layout (admin, seller, carrier) passes
  // the demo's GlobalBanner here, since shared code can't import a feature.
  banner?: React.ReactNode;
  // Feature status lines under the sidebar's connection line, composed by each layout.
  sidebarFooter?: React.ReactNode;
  children: React.ReactNode;
}

export async function AppShell({
  nav,
  user,
  banner,
  sidebarFooter,
  children,
}: AppShellProps) {
  return (
    <div className="flex min-h-dvh w-full flex-col [--toast-bottom:calc(4.5rem+env(safe-area-inset-bottom))] lg:[--toast-bottom:24px] max-lg:not-short:has-data-pinned-action:[--toast-bottom:calc(9rem+env(safe-area-inset-bottom))] short:[--toast-bottom:24px]">
      <a href="#main" className={skipLinkClassName}>
        Skip to content
      </a>
      <a
        href={`#${SIDEBAR_NAV_ID}`}
        className={`${skipLinkClassName} max-lg:hidden`}
      >
        Skip to navigation
      </a>
      <header className="sticky top-0 z-40 flex h-14 items-center gap-8 bg-nav px-safe-4 shadow-nav short:static lg:h-16 lg:px-8">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-sm bg-primary font-mono text-[10px] font-semibold text-primary-foreground">
            TMS
          </span>
          <span className="text-[15px] font-semibold whitespace-nowrap">
            Mini TMS
          </span>
          <span className="hidden truncate text-[13px] text-muted-foreground xl:inline">
            / {user.name}
          </span>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <CommandMenu nav={nav} />
          <UserMenu
            name={user.name}
            role={user.role}
            initials={user.initials}
          />
        </div>
      </header>
      {banner}
      <SidebarFrame
        nav={nav}
        footer={sidebarFooter}
        rail={(await cookies()).get(SIDEBAR_COOKIE)?.value === 'rail'}
      >
        <main
          id="main"
          tabIndex={-1}
          className="flex-1 px-safe-4 outline-none pt-5 pb-24 max-lg:not-short:has-data-pinned-action:pb-44 short:pb-5 md:px-safe-10 md:pt-7 lg:pb-10"
        >
          <PageTransition>{children}</PageTransition>
        </main>
      </SidebarFrame>
      <NavList
        nav={nav}
        footer={sidebarFooter}
        className="fixed inset-x-0 bottom-0 z-40 short:static lg:hidden"
      />
      <Toaster
        offset={{ bottom: 'var(--toast-bottom)' }}
        mobileOffset={{ bottom: 'var(--toast-bottom)' }}
      />
      <SessionSync />
    </div>
  );
}

const skipLinkClassName =
  'sr-only rounded-sm bg-background px-3 py-2 text-sm font-semibold focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:ring-3 focus:ring-ring/50';
