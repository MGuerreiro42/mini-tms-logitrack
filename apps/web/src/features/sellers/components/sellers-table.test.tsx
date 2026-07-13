import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { useRouter } from 'next/navigation';
import { setSession } from '@/lib/session';
import { server } from '@/test/msw/server';
import { renderWithQueryClient } from '@/test/render';
import { SellersTable } from './sellers-table';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

const API_URL = 'http://localhost:3333';

const seller = {
  id: 'seller-1',
  companyName: 'Example Store',
  document: '12345678000199',
  status: 'PENDING',
  createdAt: '2026-01-01T00:00:00.000Z',
};

describe('SellersTable', () => {
  let requestedUrls: string[] = [];

  beforeEach(() => {
    requestedUrls = [];
    vi.mocked(useRouter).mockReturnValue({
      push: vi.fn(),
    } as unknown as ReturnType<typeof useRouter>);
    setSession({
      token: 'signed.jwt.token',
      role: 'ADMIN',
      userId: 'user-1',
      email: 'admin@example.com',
    });
    server.use(
      http.get(`${API_URL}/sellers`, ({ request }) => {
        requestedUrls.push(request.url);
        return HttpResponse.json({
          data: [seller],
          meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
        });
      }),
    );
  });

  it('defaults to the Pending filter', async () => {
    renderWithQueryClient(<SellersTable />);

    await screen.findByText('Example Store');
    expect(requestedUrls[0]).toContain('status=PENDING');
  });

  it('switching to the All tab refetches without a status filter and resets to page 1', async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<SellersTable />);
    await screen.findByText('Example Store');

    await user.click(screen.getByRole('tab', { name: 'All' }));

    await waitFor(() => expect(requestedUrls.at(-1)).not.toContain('status='));
  });
});
