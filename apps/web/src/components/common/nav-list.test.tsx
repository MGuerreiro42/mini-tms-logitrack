import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { resetNavigation } from '@/test/navigation';
import { NavList } from './nav-list';
import type { NavSection } from './nav-tree';

const nav: NavSection[] = [
  {
    items: [
      { name: 'Overview', href: '/seller', icon: null, tab: true },
      {
        name: 'Shipments',
        href: '/seller/shipments',
        icon: null,
        tab: true,
        views: [{ name: 'Late', param: 'view', value: 'late' }],
      },
      {
        name: 'Create shipment',
        shortName: 'Create',
        href: '/seller/shipments/new',
        icon: null,
        tab: true,
      },
    ],
  },
  {
    label: 'Setup',
    items: [{ name: 'Profile', href: '/seller/profile', icon: null }],
  },
];

describe('NavList', () => {
  it('shows the tab items by short name plus More', () => {
    resetNavigation('/seller/shipments/new');
    render(<NavList nav={nav} />);

    expect(screen.getAllByRole('link')).toHaveLength(3);
    expect(screen.getByRole('link', { name: 'Create' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('button', { name: 'More' })).not.toHaveAttribute(
      'aria-current',
    );
  });

  it('marks More current for a route that has no tab', () => {
    resetNavigation('/seller/profile');
    render(<NavList nav={nav} />);

    expect(screen.getByRole('button', { name: 'More' })).toHaveAttribute(
      'aria-current',
      'true',
    );
  });

  it('opens the whole tree in a sheet that closes on navigation', async () => {
    resetNavigation('/seller');
    const user = userEvent.setup();
    render(<NavList nav={nav} footer={<p>Chaos · off</p>} />);

    await user.click(screen.getByRole('button', { name: 'More' }));
    const sheet = screen.getByRole('dialog', { name: 'Navigation' });
    expect(sheet).toHaveTextContent('Chaos · off');
    const late = screen.getByRole('link', { name: 'Late' });
    expect(late).toHaveAttribute('href', '/seller/shipments?view=late');
    await user.click(late);

    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('returns focus to More on Esc', async () => {
    resetNavigation('/seller');
    const user = userEvent.setup();
    render(<NavList nav={nav} />);

    const more = screen.getByRole('button', { name: 'More' });
    await user.click(more);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(more).toHaveFocus();
  });
});
