'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import {
  type CurrentNav,
  currentNav,
  type NavLink,
  type NavSection,
  navLinks,
  viewHref,
} from '@/components/common/nav-tree';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export const SIDEBAR_NAV_ID = 'sidebar-nav';

export function Sidebar({ nav }: { nav: NavSection[] }) {
  return (
    <div className="sticky top-16 flex h-[calc(100dvh-4rem)] flex-col overflow-y-auto bg-nav p-3 shadow-[1px_0_0_var(--nav-line)] short:top-0 short:h-dvh">
      <nav id={SIDEBAR_NAV_ID} aria-label="Main" tabIndex={-1}>
        <Suspense fallback={<NavTree nav={nav} search={null} />}>
          <NavTreeWithSearch nav={nav} />
        </Suspense>
      </nav>
    </div>
  );
}

function NavTreeWithSearch({ nav }: { nav: NavSection[] }) {
  return <NavTree nav={nav} search={useSearchParams()} />;
}

export function NavTree({
  nav,
  search,
}: {
  nav: NavSection[];
  search: URLSearchParams | null;
}) {
  const current = currentNav(nav, usePathname(), search);

  return (
    <div className="flex flex-col gap-4">
      {navLinks(nav)
        .filter((link) => link.primary)
        .map((link) => (
          <Button
            key={link.href}
            asChild
            variant="outline"
            className="w-full justify-start gap-2"
          >
            <Link
              href={link.href}
              aria-current={current.link === link ? 'page' : undefined}
            >
              {link.icon}
              {link.name}
            </Link>
          </Button>
        ))}
      {nav.map((section) => {
        const items = section.items.filter((link) => !link.primary);
        if (items.length === 0) return null;
        return (
          <div key={section.label ?? ''} className="flex flex-col gap-1">
            {section.label && (
              <span className="flex h-6 items-center px-2 text-[11px] font-semibold tracking-[0.04em] text-muted-foreground">
                {section.label}
              </span>
            )}
            <ul className="flex flex-col gap-0.5">
              {items.map((link) => (
                <NavRow key={link.href} link={link} current={current} />
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

const rowFocus =
  'outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset';

function rowClassName(state: 'rest' | 'parent' | 'current') {
  return cn(
    rowFocus,
    'flex h-8 min-w-0 flex-1 items-center gap-2 rounded-sm px-2 text-[13px] font-medium transition-colors duration-(--duration-fast) pointer-coarse:h-9 [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:stroke-[1.75]',
    state === 'rest' &&
      'text-muted-foreground hover:bg-accent hover:text-foreground',
    state === 'parent' &&
      'text-foreground hover:bg-accent [&_svg]:text-primary',
    state === 'current' &&
      'bg-selected font-semibold text-foreground dark:shadow-[inset_0_0_0_1px_var(--border)] [&_svg]:text-primary',
  );
}

function NavRow({ link, current }: { link: NavLink; current: CurrentNav }) {
  const isLink = current.link === link;
  const state = !isLink ? 'rest' : current.view ? 'parent' : 'current';
  return (
    <li>
      <Link
        href={link.href}
        aria-current={state === 'current' ? 'page' : undefined}
        className={rowClassName(state)}
      >
        {link.icon}
        <span className="truncate">{link.name}</span>
      </Link>
      {link.views && (
        <ul className="mt-0.5 flex flex-col gap-0.5">
          {link.views.map((view) => {
            const active = isLink && current.view === view;
            return (
              <li key={`${view.param}:${view.value}`}>
                <Link
                  href={viewHref(link, view)}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    rowClassName(active ? 'current' : 'rest'),
                    'pl-7',
                  )}
                >
                  <span className="truncate">{view.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
}
