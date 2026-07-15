import { type NavItem, NavList } from '@/components/common/nav-list';
import { UserMenu } from '@/components/common/user-menu';
import { Toaster } from '@/components/ui/sonner';

interface AppShellProps {
  navGroupLabel: string;
  navItems: NavItem[];
  user: { name: string; role: string; initials: string };
  children: React.ReactNode;
}

export function AppShell({
  navGroupLabel,
  navItems,
  user,
  children,
}: AppShellProps) {
  return (
    // h-screen, not h-full: h-full needs a definite (not min-height) height
    // chain all the way up to the viewport to resolve correctly, which
    // body's min-h-full doesn't provide — h-screen (100vh) is viewport-
    // relative and decouples this from that ancestor chain entirely, so the
    // sidebar always fills the real viewport regardless of content height.
    <div className="flex h-screen w-full">
      <aside className="flex h-full w-56 shrink-0 flex-col border-r bg-card">
        <div className="flex items-center gap-2.5 border-b p-4">
          <div className="flex size-7 items-center justify-center rounded-md bg-primary font-mono text-[10px] font-semibold tracking-wide text-primary-foreground">
            TMS
          </div>
          <div>
            <div className="text-[13px] font-semibold leading-tight">
              Mini TMS
            </div>
            <div className="text-[10.5px] text-muted-foreground">
              Transportation · BR
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className="px-3.5 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {navGroupLabel}
          </div>
          <NavList items={navItems} />
        </div>
        <UserMenu name={user.name} role={user.role} initials={user.initials} />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
      <Toaster />
    </div>
  );
}
