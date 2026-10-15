import { QueryClient } from '@tanstack/react-query';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'next-themes';
import { hardNavigate } from '@/lib/hard-navigate';
import { getSessionFromDocument, setSession } from '@/lib/session';
import { renderWithQueryClient } from '@/test/render';
import { UserMenu } from './user-menu';

vi.mock('@/lib/hard-navigate', () => ({ hardNavigate: vi.fn() }));

const props = { name: 'Seller', role: 'Seller', initials: 'SE' };

describe('UserMenu', () => {
  it('clears the query cache and the session, then leaves with a full page load', async () => {
    setSession({ token: 't', role: 'SELLER', userId: 'u', email: 'e' });
    const queryClient = new QueryClient();
    queryClient.setQueryData(['shipments', 'list'], { data: [] });
    const user = userEvent.setup();
    renderWithQueryClient(<UserMenu {...props} />, queryClient);

    await user.click(screen.getByRole('button', { name: /seller/i }));
    await user.click(await screen.findByRole('menuitem', { name: 'Log out' }));

    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
    expect(getSessionFromDocument()).toBeNull();
    expect(hardNavigate).toHaveBeenCalledWith('/login');
  });

  it('switches the theme from the menu', async () => {
    const user = userEvent.setup();
    renderWithQueryClient(
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <UserMenu {...props} />
      </ThemeProvider>,
    );

    await user.click(screen.getByRole('button', { name: /seller/i }));
    expect(
      await screen.findByRole('menuitemradio', { name: 'System' }),
    ).toBeChecked();
    await user.click(screen.getByRole('menuitemradio', { name: 'Dark' }));

    expect(document.documentElement).toHaveClass('dark');
  });
});
