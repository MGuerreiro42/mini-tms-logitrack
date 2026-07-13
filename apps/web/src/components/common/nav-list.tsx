'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export interface NavItem {
  name: string;
  href: string;
}

export function NavList({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  // Pick the single most specific (longest href) match, not "does this
  // item's href prefix the pathname" independently per item — a section
  // root like /seller is a literal string prefix of every nested route
  // (/seller/modalities, /seller/shipments/...), so a naive per-item
  // startsWith check marks it active on every seller page, not just its own.
  const activeHref = items
    .filter(
      (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
    )
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <nav className="flex flex-col gap-0.5 p-2.5">
      {items.map((item) => {
        const active = item.href === activeHref;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm',
              active
                ? 'bg-muted font-semibold text-foreground'
                : 'font-medium text-muted-foreground hover:bg-muted/50',
            )}
          >
            <span
              className={cn(
                'size-1.5 shrink-0 rounded-full',
                active ? 'bg-primary' : 'bg-border',
              )}
            />
            {item.name}
          </Link>
        );
      })}
    </nav>
  );
}
