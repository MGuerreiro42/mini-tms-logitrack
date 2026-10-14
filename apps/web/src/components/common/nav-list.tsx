'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export interface NavItem {
  name: string;
  shortName?: string;
  href: string;
}

const MAX_TABS = 4;

function useActiveHref(items: NavItem[]): string | undefined {
  const pathname = usePathname();

  // Longest match wins, otherwise the section root (/seller) is active on every nested route.
  return items
    .filter(
      (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
    )
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
}

export function NavList({
  items,
  variant = 'bar',
  className,
}: {
  items: NavItem[];
  variant?: 'bar' | 'tabs';
  className?: string;
}) {
  const activeHref = useActiveHref(items);

  if (variant === 'tabs') {
    const overflows = items.length > MAX_TABS;
    const tabs = overflows ? items.slice(0, MAX_TABS - 1) : items;
    const more = overflows ? items.slice(MAX_TABS - 1) : [];
    const moreActive = more.some((item) => item.href === activeHref);

    return (
      <nav
        aria-label="Main"
        className={cn(
          'grid auto-cols-fr grid-flow-col bg-nav px-2 pt-2 pb-[max(--spacing(2),env(safe-area-inset-bottom))] shadow-tab-bar',
          className,
        )}
      >
        {tabs.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={item.href === activeHref ? 'page' : undefined}
            className={tabClassName(item.href === activeHref)}
          >
            <TabMarker active={item.href === activeHref} />
            {item.shortName ?? item.name}
          </Link>
        ))}
        {more.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-current={moreActive ? true : undefined}
              className={tabClassName(moreActive)}
            >
              <TabMarker active={moreActive} />
              More
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top" className="w-56">
              {more.map((item) => (
                <DropdownMenuItem key={item.href} asChild className="min-h-11">
                  <Link
                    href={item.href}
                    aria-current={item.href === activeHref ? 'page' : undefined}
                  >
                    {item.name}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </nav>
    );
  }

  return (
    <nav aria-label="Main" className={cn('flex items-center gap-1', className)}>
      {items.map((item) => {
        const active = item.href === activeHref;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'inline-flex h-9 items-center rounded-sm px-3 text-sm whitespace-nowrap outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
              active
                ? 'bg-muted font-semibold text-foreground'
                : 'font-medium text-muted-foreground hover:text-foreground',
            )}
          >
            {item.name}
          </Link>
        );
      })}
    </nav>
  );
}

function tabClassName(active: boolean) {
  return cn(
    'flex min-h-11 flex-col items-center justify-center gap-1 rounded-sm text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
    active ? 'font-semibold text-primary' : 'text-muted-foreground',
  );
}

function TabMarker({ active }: { active: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn('h-1 w-5.5 rounded-full', active && 'bg-primary')}
    />
  );
}
