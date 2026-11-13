import type { ReactNode } from 'react';

export interface NavView {
  name: string;
  param: 'view' | 'status';
  value: string;
  countKey?: string;
}

export interface NavLink {
  name: string;
  shortName?: string;
  href: string;
  // Other route roots this item owns, e.g. Monitoring owns /admin/shipments.
  owns?: string[];
  icon: ReactNode;
  shortcut?: string;
  tab?: boolean;
  primary?: boolean;
  views?: NavView[];
  defaultView?: string;
}

export interface NavSection {
  label?: string;
  items: NavLink[];
}

export interface CurrentNav {
  link?: NavLink;
  view?: NavView;
}

export const viewHref = (link: NavLink, view: NavView) =>
  `${link.href}?${view.param}=${encodeURIComponent(view.value)}`;

export const navLinks = (nav: NavSection[]) =>
  nav.flatMap((section) => section.items);

// search is null until the URL's query can be read (outside Suspense): no view matches then.
export function currentNav(
  nav: NavSection[],
  pathname: string,
  search: URLSearchParams | null,
): CurrentNav {
  const matches = (root: string) =>
    pathname === root || pathname.startsWith(`${root}/`);
  // Longest match wins, otherwise the section root (/seller) is current on every nested route.
  const link = navLinks(nav)
    .flatMap((item) =>
      [item.href, ...(item.owns ?? [])]
        .filter(matches)
        .map((root) => ({ item, length: root.length })),
    )
    .sort((a, b) => b.length - a.length)[0]?.item;
  if (!link || !search || pathname !== link.href) return { link };

  const param = (['view', 'status'] as const).find((key) => search.has(key));
  const view = link.views?.find((row) =>
    param
      ? row.param === param && row.value === search.get(param)
      : row.value === link.defaultView,
  );
  return { link, view };
}
