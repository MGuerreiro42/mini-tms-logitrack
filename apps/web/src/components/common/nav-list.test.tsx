import { render, screen } from '@testing-library/react';
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
  // Regression test for a real bug: a naive per-item `pathname.startsWith`
  // check marked "Profile" (/seller) active on every nested seller route,
  // since it's a literal string prefix of all of them.
  it('marks only the section root active when the pathname is exactly the root', () => {
    vi.mocked(usePathname).mockReturnValue('/seller');
    render(<NavList items={items} />);

    expect(screen.getByRole('link', { name: /profile/i })).toHaveClass(
      'bg-muted',
    );
    expect(screen.getByRole('link', { name: /modalities/i })).not.toHaveClass(
      'bg-muted',
    );
  });

  it('marks the nested item active, not the section root, on a nested route', () => {
    vi.mocked(usePathname).mockReturnValue('/seller/modalities');
    render(<NavList items={items} />);

    expect(screen.getByRole('link', { name: /modalities/i })).toHaveClass(
      'bg-muted',
    );
    expect(screen.getByRole('link', { name: /profile/i })).not.toHaveClass(
      'bg-muted',
    );
  });

  it('picks the longest matching href on a deeper nested route', () => {
    vi.mocked(usePathname).mockReturnValue('/seller/shipments/new');
    render(<NavList items={items} />);

    expect(screen.getByRole('link', { name: /shipments/i })).toHaveClass(
      'bg-muted',
    );
    expect(screen.getByRole('link', { name: /profile/i })).not.toHaveClass(
      'bg-muted',
    );
  });

  it('marks nothing active when the pathname matches no item', () => {
    vi.mocked(usePathname).mockReturnValue('/admin');
    render(<NavList items={items} />);

    for (const item of items) {
      expect(screen.getByRole('link', { name: item.name })).not.toHaveClass(
        'bg-muted',
      );
    }
  });
});
