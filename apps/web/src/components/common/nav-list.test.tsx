import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { usePathname } from 'next/navigation';
import { NavList } from './nav-list';

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(),
}));

const items = [
  { name: 'Profile', href: '/seller' },
  { name: 'Modalities', href: '/seller/modalities' },
  { name: 'Shipments', href: '/seller/shipments' },
];

describe('NavList', () => {
  it('marks only the section root active when the pathname is exactly the root', () => {
    vi.mocked(usePathname).mockReturnValue('/seller');
    render(<NavList items={items} />);

    expect(screen.getByRole('link', { name: /profile/i })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(
      screen.getByRole('link', { name: /modalities/i }),
    ).not.toHaveAttribute('aria-current');
  });

  it('marks the nested item active, not the section root, on a nested route', () => {
    vi.mocked(usePathname).mockReturnValue('/seller/modalities');
    render(<NavList items={items} />);

    expect(screen.getByRole('link', { name: /modalities/i })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('link', { name: /profile/i })).not.toHaveAttribute(
      'aria-current',
    );
  });

  it('picks the longest matching href on a deeper nested route', () => {
    vi.mocked(usePathname).mockReturnValue('/seller/shipments/new');
    render(<NavList items={items} />);

    expect(screen.getByRole('link', { name: /shipments/i })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('link', { name: /profile/i })).not.toHaveAttribute(
      'aria-current',
    );
  });

  it('marks nothing active when the pathname matches no item', () => {
    vi.mocked(usePathname).mockReturnValue('/admin');
    render(<NavList items={items} />);

    for (const item of items) {
      expect(screen.getByRole('link', { name: item.name })).not.toHaveAttribute(
        'aria-current',
      );
    }
  });
});

describe('NavList tabs', () => {
  const many = [
    ...items,
    { name: 'Create shipment', href: '/seller/shipments/new' },
    { name: 'Settings', href: '/seller/settings' },
  ];

  it('shows every item as a tab when there are four or fewer', () => {
    vi.mocked(usePathname).mockReturnValue('/seller');
    render(<NavList items={items} variant="tabs" />);

    expect(screen.getAllByRole('link')).toHaveLength(3);
    expect(screen.queryByRole('button', { name: /more/i })).toBeNull();
  });

  it('folds the overflow into More and marks it current for a folded route', async () => {
    vi.mocked(usePathname).mockReturnValue('/seller/settings');
    const user = userEvent.setup();
    render(<NavList items={many} variant="tabs" />);

    expect(screen.getAllByRole('link')).toHaveLength(3);
    await user.click(screen.getByRole('button', { name: /more/i }));

    expect(
      await screen.findByRole('menuitem', { name: 'Settings' }),
    ).toHaveAttribute('aria-current', 'page');
  });
});
