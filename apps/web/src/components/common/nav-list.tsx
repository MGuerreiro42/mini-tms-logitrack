'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  currentNav,
  type NavSection,
  navLinks,
} from '@/components/common/nav-tree';
import { LiveNavTree } from '@/components/common/sidebar';
import { ConnectionStatusRow } from '@/components/common/sidebar-status-row';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

// Below 1024 px: the tab items plus More, a bottom sheet holding the whole sidebar.
export function NavList({
  nav,
  footer,
  className,
}: {
  nav: NavSection[];
  footer?: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const active = currentNav(nav, usePathname(), null).link;
  const tabs = navLinks(nav).filter((link) => link.tab);
  const moreActive = active !== undefined && !active.tab;

  return (
    <nav
      aria-label="Main"
      className={cn(
        'grid auto-cols-fr grid-flow-col bg-nav px-safe-2 pt-2 pb-[max(--spacing(2),env(safe-area-inset-bottom))] shadow-tab-bar',
        className,
      )}
    >
      {tabs.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={item === active ? 'page' : undefined}
          className={tabClassName(item === active)}
        >
          <TabMarker active={item === active} />
          <span className="max-w-full truncate">
            {item.shortName ?? item.name}
          </span>
        </Link>
      ))}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger
          aria-current={moreActive ? true : undefined}
          className={tabClassName(moreActive)}
        >
          <TabMarker active={moreActive} />
          More
        </DialogTrigger>
        <DialogContent
          aria-describedby={undefined}
          // Any link inside navigates, so the sheet closes with it.
          onClickCapture={(event) => {
            if ((event.target as Element).closest('a')) setOpen(false);
          }}
          className="top-auto bottom-0 left-0 max-h-[85dvh] max-w-none translate-x-0 translate-y-0 gap-5 rounded-b-none px-4 pt-6 pb-[max(--spacing(4),env(safe-area-inset-bottom))] sm:max-w-none [&_a]:min-h-11 [&_button]:min-h-11 [&_button]:min-w-11"
        >
          <DialogTitle>Navigation</DialogTitle>
          <LiveNavTree nav={nav} />
          <div className="flex flex-col gap-0.5 pt-3 shadow-[0_-1px_0_var(--nav-line)]">
            <ConnectionStatusRow />
            {footer}
          </div>
        </DialogContent>
      </Dialog>
    </nav>
  );
}

function tabClassName(active: boolean) {
  return cn(
    'flex min-h-11 min-w-0 flex-col items-center justify-center gap-1 rounded-sm px-0.5 text-xs outline-none min-[375px]:text-sm focus-visible:ring-3 focus-visible:ring-ring/50',
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
