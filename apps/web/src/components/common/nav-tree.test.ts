import { currentNav, type NavSection } from './nav-tree';

const shipments = {
  name: 'Shipments',
  href: '/seller/shipments',
  icon: null,
  views: [
    { name: 'Late', param: 'view' as const, value: 'late' },
    { name: 'Delivered', param: 'status' as const, value: 'DELIVERED' },
  ],
};
const queue = {
  name: 'Queue',
  href: '/carrier/queue',
  icon: null,
  defaultView: 'mine',
  views: [
    { name: 'Unclaimed', param: 'view' as const, value: 'unclaimed' },
    { name: 'Mine', param: 'view' as const, value: 'mine' },
  ],
};
const nav: NavSection[] = [
  {
    items: [
      { name: 'Overview', href: '/seller', icon: null },
      shipments,
      {
        name: 'Monitoring',
        href: '/admin/monitoring',
        owns: ['/admin/shipments'],
        icon: null,
      },
      queue,
    ],
  },
];

const at = (url: string, withSearch = true) => {
  const parsed = new URL(url, 'http://x');
  const current = currentNav(
    nav,
    parsed.pathname,
    withSearch ? parsed.searchParams : null,
  );
  return [current.link?.name, current.view?.name];
};

describe('currentNav', () => {
  it('picks the longest matching root', () => {
    expect(at('/seller')).toEqual(['Overview', undefined]);
    expect(at('/seller/shipments/abc')).toEqual(['Shipments', undefined]);
    expect(at('/admin/shipments/abc')).toEqual(['Monitoring', undefined]);
    expect(at('/elsewhere')).toEqual([undefined, undefined]);
  });

  it('matches a view by its own param', () => {
    expect(at('/seller/shipments?view=late')).toEqual(['Shipments', 'Late']);
    expect(at('/seller/shipments?status=DELIVERED')).toEqual([
      'Shipments',
      'Delivered',
    ]);
    expect(at('/seller/shipments?status=late')).toEqual([
      'Shipments',
      undefined,
    ]);
  });

  it('falls back to the default view only without view or status', () => {
    expect(at('/seller/shipments')).toEqual(['Shipments', undefined]);
    expect(at('/carrier/queue')).toEqual(['Queue', 'Mine']);
    expect(at('/carrier/queue?view=unclaimed')).toEqual(['Queue', 'Unclaimed']);
    expect(at('/carrier/queue?status=DELIVERED')).toEqual(['Queue', undefined]);
  });

  it('matches no view on detail pages or before the query is readable', () => {
    expect(at('/carrier/queue/abc?view=mine')).toEqual(['Queue', undefined]);
    expect(at('/carrier/queue?view=mine', false)).toEqual(['Queue', undefined]);
  });
});
