import { render, screen, within } from '@testing-library/react';
import { resetNavigation } from '@/test/navigation';
import type { NavSection } from './nav-tree';
import { Sidebar } from './sidebar';

const nav: NavSection[] = [
  {
    items: [
      { name: 'Overview', href: '/seller', icon: null },
      {
        name: 'Shipments',
        href: '/seller/shipments',
        icon: null,
        views: [
          { name: 'Active', param: 'view', value: 'active' },
          { name: 'Late', param: 'view', value: 'late' },
        ],
      },
      {
        name: 'Create shipment',
        href: '/seller/shipments/new',
        icon: null,
        primary: true,
      },
    ],
  },
  {
    label: 'Setup',
    items: [{ name: 'Profile', href: '/seller/profile', icon: null }],
  },
];

const link = (name: string) => screen.getByRole('link', { name });

describe('Sidebar', () => {
  it('is the Main navigation with the primary item first', () => {
    resetNavigation('/seller');
    render(<Sidebar nav={nav} />);

    const main = screen.getByRole('navigation', { name: 'Main' });
    expect(within(main).getAllByRole('link')[0]).toHaveTextContent(
      'Create shipment',
    );
    expect(link('Overview')).toHaveAttribute('aria-current', 'page');
  });

  it('marks the view row current, not its parent', () => {
    resetNavigation('/seller/shipments?view=late');
    render(<Sidebar nav={nav} />);

    expect(link('Late')).toHaveAttribute('aria-current', 'page');
    expect(link('Late')).toHaveAttribute('href', '/seller/shipments?view=late');
    expect(link('Shipments')).not.toHaveAttribute('aria-current');
    expect(link('Active')).not.toHaveAttribute('aria-current');
  });

  it('marks the level-1 item current when no view matches', () => {
    resetNavigation('/seller/shipments');
    render(<Sidebar nav={nav} />);

    expect(link('Shipments')).toHaveAttribute('aria-current', 'page');
    expect(link('Late')).not.toHaveAttribute('aria-current');
  });
});
