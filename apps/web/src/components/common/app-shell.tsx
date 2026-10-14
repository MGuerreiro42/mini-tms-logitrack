import { type NavItem, NavList } from '@/components/common/nav-list';
import { SessionSync } from '@/components/common/session-sync';
import { UserMenu } from '@/components/common/user-menu';
import { Toaster } from '@/components/ui/sonner';

interface AppShellProps {
  navItems: NavItem[];
  user: { name: string; role: string; initials: string };
  children: React.ReactNode;
}

export function AppShell({ navItems, user, children }: AppShellProps) {
  return (
    <div className="flex min-h-dvh w-full flex-col">
      <header className="sticky top-0 z-40 flex h-14 items-center gap-8 bg-nav px-4 shadow-nav md:h-16 md:px-8">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-sm bg-primary font-mono text-[10px] font-semibold text-primary-foreground">
            TMS
          </span>
          <span className="text-[15px] font-semibold whitespace-nowrap">
            Mini TMS
          </span>
          <span className="hidden truncate text-[13px] text-muted-foreground lg:inline">
            / {user.name}
          </span>
        </div>
        <NavList items={navItems} className="hidden md:flex" />
        <div className="ml-auto flex items-center gap-3">
          <UserMenu
            name={user.name}
            role={user.role}
            initials={user.initials}
          />
        </div>
      </header>
      <main className="flex-1 px-4 pt-5 pb-24 md:px-10 md:pt-7 md:pb-10">
        {children}
      </main>
      <NavList
        items={navItems}
        variant="tabs"
        className="fixed inset-x-0 bottom-0 z-40 md:hidden"
      />
      <Toaster mobileOffset={{ bottom: 80 }} />
      <SessionSync />
    </div>
  );
}
