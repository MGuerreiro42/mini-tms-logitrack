import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { resetNavigation, router } from '@/test/navigation';
import { NavCountsContext } from './nav-counts';
import type { NavSection } from './nav-tree';
import { SidebarNav } from './sidebar';
import { SidebarContext } from './sidebar-context';

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
          { name: 'Late', param: 'view', value: 'late', countKey: 'late' },
          {
            name: 'Exceptions',
            param: 'view',
            value: 'exceptions',
            countKey: 'exceptions',
          },
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

describe('SidebarNav', () => {
  it('is the Main navigation with the primary item first', () => {
    resetNavigation('/seller');
    render(<SidebarNav nav={nav} />);

    const main = screen.getByRole('navigation', { name: 'Main' });
    expect(within(main).getAllByRole('link')[0]).toHaveTextContent(
      'Create shipment',
    );
    expect(link('Overview')).toHaveAttribute('aria-current', 'page');
  });

  it('marks the view row current, not its parent', () => {
    resetNavigation('/seller/shipments?view=late');
    render(<SidebarNav nav={nav} />);

    expect(link('Late')).toHaveAttribute('aria-current', 'page');
    expect(link('Late')).toHaveAttribute('href', '/seller/shipments?view=late');
    expect(link('Shipments')).not.toHaveAttribute('aria-current');
    expect(link('Active')).not.toHaveAttribute('aria-current');
  });

  it('marks the level-1 item current when no view matches', () => {
    resetNavigation('/seller/shipments');
    render(<SidebarNav nav={nav} />);

    expect(link('Shipments')).toHaveAttribute('aria-current', 'page');
    expect(link('Late')).not.toHaveAttribute('aria-current');
  });

  it('collapses a section and a view list from their disclosure buttons', async () => {
    resetNavigation('/seller');
    const user = userEvent.setup();
    render(<SidebarNav nav={nav} />);

    const setup = screen.getByRole('button', { name: 'Setup' });
    expect(setup).toHaveAttribute('aria-expanded', 'true');
    await user.click(setup);
    expect(setup).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('link', { name: 'Profile' })).toBeNull();

    await user.click(
      screen.getByRole('button', { name: 'Hide Shipments views' }),
    );
    expect(screen.queryByRole('link', { name: 'Late' })).toBeNull();
    expect(
      screen.getByRole('button', { name: 'Show Shipments views' }),
    ).toHaveAttribute('aria-expanded', 'false');
  });

  it('reopens a collapsed section when navigating into it', async () => {
    resetNavigation('/seller');
    const user = userEvent.setup();
    render(<SidebarNav nav={nav} />);

    await user.click(screen.getByRole('button', { name: 'Setup' }));
    router.push('/seller/profile');

    expect(
      await screen.findByRole('link', { name: 'Profile' }),
    ).toHaveAttribute('aria-current', 'page');
  });

  it('names counted views and puts open exceptions on the rail icon', () => {
    resetNavigation('/seller');
    const counts = { late: 2, exceptions: 3 };
    const tree = (compact: boolean) => (
      <SidebarContext value={{ compact, toggle: () => {} }}>
        <NavCountsContext value={{ counts, status: 'live' }}>
          <SidebarNav nav={nav} />
        </NavCountsContext>
      </SidebarContext>
    );
    const { rerender } = render(tree(false));

    expect(link('Late, 2 shipments')).toBeInTheDocument();
    expect(link('Shipments')).toBeInTheDocument();
    rerender(tree(true));
    expect(link('Shipments, 3 exceptions')).toBeInTheDocument();
  });
});
