import { render, screen } from '@testing-library/react';
import { getServerSession } from '@/lib/server-session';
import ForbiddenPage from './page';

vi.mock('@/lib/server-session', () => ({ getServerSession: vi.fn() }));

async function renderPage(area?: string) {
  render(await ForbiddenPage({ searchParams: Promise.resolve({ area }) }));
}

describe('ForbiddenPage', () => {
  it('names the area and who is signed in', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      token: 't',
      role: 'SELLER',
      userId: 'u',
      email: 'loja@demo.com',
    });
    await renderPage('carrier');

    expect(
      screen.getByRole('heading', { name: 'This area is for carriers' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "You're signed in as loja@demo.com (seller). Your session is still active.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Go to your dashboard' }),
    ).toHaveAttribute('href', '/seller');
  });

  it('falls back to a sign-in link without a session or a known area', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    await renderPage('constructor');

    expect(
      screen.getByRole('heading', {
        name: "You don't have access to this page",
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to sign in' })).toHaveAttribute(
      'href',
      '/login',
    );
  });
});
