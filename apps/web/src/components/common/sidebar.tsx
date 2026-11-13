'use client';

import { ChevronDownIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense, useId, useState } from 'react';
import { CountPill, useNavCounts } from '@/components/common/nav-counts';
import {
  type CurrentNav,
  currentNav,
  type NavLink,
  type NavSection,
  navLinks,
  viewHref,
} from '@/components/common/nav-tree';
import { RailTooltip } from '@/components/common/rail-tooltip';
import { useSidebar } from '@/components/common/sidebar-context';
import { Button } from '@/components/ui/button';
import { plural } from '@/lib/plural';
import { cn } from '@/lib/utils';

export const SIDEBAR_NAV_ID = 'sidebar-nav';

export function SidebarNav({ nav }: { nav: NavSection[] }) {
  return (
    <nav id={SIDEBAR_NAV_ID} aria-label="Main" tabIndex={-1}>
      <Suspense fallback={<NavTree nav={nav} search={null} />}>
        <NavTreeWithSearch nav={nav} />
      </Suspense>
    </nav>
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
  const disclosure = useDisclosures(nav, current);
  // The rail has no section labels, so it shows every section's icons.
  const { compact } = useSidebar();

  return (
    <div className="flex flex-col gap-4">
      {navLinks(nav)
        .filter((link) => link.primary)
        .map((link) => (
          <RailTooltip key={link.href} label={link.name}>
            <Button
              asChild
              variant="outline"
              className="w-full justify-start gap-2 rail:justify-center rail:px-0"
            >
              <Link
                href={link.href}
                aria-current={current.link === link ? 'page' : undefined}
              >
                {link.icon}
                <span className="rail:sr-only">{link.name}</span>
              </Link>
            </Button>
          </RailTooltip>
        ))}
      {nav.map((section) => {
        const items = section.items.filter((link) => !link.primary);
        if (items.length === 0) return null;
        const list = (
          <ul className="flex flex-col gap-0.5">
            {items.map((link) => (
              <NavRow
                key={link.href}
                link={link}
                current={current}
                views={link.views && disclosure(viewsKey(link))}
              />
            ))}
          </ul>
        );
        if (!section.label) return <div key="">{list}</div>;
        const { open, controls, onToggle } = disclosure(section.label);
        return (
          <div key={section.label} className="flex flex-col gap-1">
            <button
              type="button"
              aria-expanded={open}
              aria-controls={controls}
              onClick={onToggle}
              className={cn(
                rowFocus,
                'flex h-6 items-center justify-between rounded-sm px-2 text-[11px] rail:hidden font-semibold tracking-[0.04em] text-muted-foreground hover:text-foreground',
              )}
            >
              {section.label}
              <Chevron open={open} />
            </button>
            <div id={controls} hidden={!open && !compact}>
              {list}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const viewsKey = (link: NavLink) => `views:${link.href}`;

interface Disclosure {
  open: boolean;
  controls: string;
  onToggle: () => void;
}

// Collapsed sections live for the layout's lifetime; navigating into one opens it again.
function useDisclosures(nav: NavSection[], current: CurrentNav) {
  const id = useId();
  const [closed, setClosed] = useState<ReadonlySet<string>>(new Set());
  const [shownHref, setShownHref] = useState(current.link?.href);

  const update = (change: (keys: Set<string>) => void) =>
    setClosed((keys) => {
      const next = new Set(keys);
      change(next);
      return next;
    });

  if (current.link && current.link.href !== shownHref) {
    const { link } = current;
    setShownHref(link.href);
    const section = nav.find((s) => s.items.includes(link))?.label;
    update((keys) => {
      keys.delete(viewsKey(link));
      if (section) keys.delete(section);
    });
  }

  return (key: string): Disclosure => ({
    open: !closed.has(key),
    controls: `${id}-${key.replace(/\W/g, '-')}`,
    onToggle: () =>
      update((keys) => {
        if (!keys.delete(key)) keys.add(key);
      }),
  });
}

const rowFocus =
  'outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset';

function rowClassName(state: 'rest' | 'parent' | 'current') {
  return cn(
    rowFocus,
    'flex h-8 min-w-0 flex-1 items-center gap-2 rounded-sm px-2 text-[13px] rail:px-3 font-medium transition-colors duration-(--duration-fast) pointer-coarse:h-9 [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:stroke-[1.75]',
    state === 'rest' &&
      'text-muted-foreground hover:bg-accent hover:text-foreground',
    state === 'parent' &&
      'text-foreground hover:bg-accent [&_svg]:text-primary',
    state === 'current' &&
      'bg-selected font-semibold text-foreground dark:shadow-[inset_0_0_0_1px_var(--border)] [&_svg]:text-primary',
  );
}

function NavRow({
  link,
  current,
  views,
}: {
  link: NavLink;
  current: CurrentNav;
  views?: Disclosure;
}) {
  const isLink = current.link === link;
  const state = !isLink ? 'rest' : current.view ? 'parent' : 'current';
  const { compact } = useSidebar();
  const exceptions = useNavCounts().counts?.exceptions ?? 0;
  // In the rail the views are hidden, so the owning icon carries the open exceptions.
  const railExceptions =
    compact &&
    exceptions > 0 &&
    link.views?.some((view) => view.countKey === 'exceptions')
      ? `, ${plural(exceptions, 'exception')}`
      : undefined;
  return (
    <li>
      <div className="flex items-center gap-0.5">
        <RailTooltip
          label={railExceptions ? `${link.name}${railExceptions}` : link.name}
        >
          <Link
            href={link.href}
            aria-current={state === 'current' ? 'page' : undefined}
            className={cn(rowClassName(state), 'relative')}
          >
            {link.icon}
            <span className="truncate transition-opacity duration-100 rail:opacity-0">
              {link.name}
              {railExceptions && (
                <span className="sr-only">{railExceptions}</span>
              )}
            </span>
            {railExceptions && (
              <span
                aria-hidden
                className="absolute top-1.5 left-6 size-2 rounded-full bg-destructive ring-2 ring-nav"
              />
            )}
          </Link>
        </RailTooltip>
        {views && (
          <button
            type="button"
            aria-expanded={views.open}
            aria-controls={views.controls}
            aria-label={`${views.open ? 'Hide' : 'Show'} ${link.name} views`}
            onClick={views.onToggle}
            className={cn(
              rowFocus,
              'flex size-8 shrink-0 items-center justify-center rounded-sm text-muted-foreground hover:bg-accent hover:text-foreground pointer-coarse:size-9 rail:hidden',
            )}
          >
            <Chevron open={views.open} />
          </button>
        )}
      </div>
      {link.views && views && (
        <ul
          id={views.controls}
          hidden={!views.open}
          className="mt-0.5 flex flex-col gap-0.5 rail:hidden"
        >
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
                  {view.countKey && <CountPill countKey={view.countKey} />}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <ChevronDownIcon
      aria-hidden
      className={cn(
        'size-3.5 transition-transform duration-(--duration-fast)',
        !open && '-rotate-90',
      )}
    />
  );
}
