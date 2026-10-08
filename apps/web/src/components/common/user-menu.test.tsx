import { QueryClient } from '@tanstack/react-query';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/navigation';
import { renderWithQueryClient } from '@/test/render';
import { UserMenu } from './user-menu';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

const props = { name: 'Seller', role: 'Seller', initials: 'SE' };

describe('UserMenu', () => {
  it('clears the query cache and the session on logout', async () => {
    const push = vi.fn();
    vi.mocked(useRouter).mockReturnValue({ push } as unknown as ReturnType<
      typeof useRouter
    >);
    document.cookie = 'tms_session=abc; path=/';
    const queryClient = new QueryClient();
    queryClient.setQueryData(['shipments', 'list'], { data: [] });
    const user = userEvent.setup();
    renderWithQueryClient(<UserMenu {...props} />, queryClient);

    await user.click(screen.getByRole('button', { name: /seller/i }));
    await user.click(await screen.findByRole('menuitem', { name: 'Log out' }));

    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
    expect(document.cookie).not.toContain('tms_session=abc');
    expect(push).toHaveBeenCalledWith('/login');
  });
});
