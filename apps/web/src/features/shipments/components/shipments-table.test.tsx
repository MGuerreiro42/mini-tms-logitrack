import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { setSession } from '@/lib/session';
import { server } from '@/test/msw/server';
import { currentUrl, resetNavigation } from '@/test/navigation';
import { renderWithQueryClient } from '@/test/render';
import { ShipmentsTable } from './shipments-table';

const API_URL = 'http://localhost:3333';
const STATUS_COUNTS = {
  PENDING: 2,
  ACCEPTED: 0,
  COLLECTED: 0,
  IN_TRANSIT: 1,
  OUT_FOR_DELIVERY: 0,
  DELIVERED: 4,
  FAILED_DELIVERY: 1,
  CANCELLED: 1,
  RETURNED: 0,
};

describe('ShipmentsTable', () => {
  let listUrls: URL[] = [];

  beforeEach(() => {
    listUrls = [];
    setSession({
      token: 'signed.jwt.token',
      role: 'SELLER',
      userId: 'user-1',
      email: 'seller@example.com',
    });
    server.use(
      http.get(`${API_URL}/shipments`, ({ request }) => {
        listUrls.push(new URL(request.url));
        return HttpResponse.json({
          data: [],
          meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
        });
      }),
      http.get(`${API_URL}/shipments/status-counts`, () =>
        HttpResponse.json(STATUS_COUNTS),
      ),
      http.get(`${API_URL}/shipments/view-counts`, () =>
        HttpResponse.json({ active: 3, exceptions: 2, done: 5 }),
      ),
    );
  });

  it('shows the views with their counts and opens one through the URL', async () => {
    resetNavigation('/seller/shipments?status=DELIVERED&page=2');
    const user = userEvent.setup();
    renderWithQueryClient(<ShipmentsTable />);

    expect(
      await screen.findByRole('tab', { name: 'Exceptions, 2' }),
    ).toBeVisible();
    expect(screen.getByRole('tab', { name: 'All, 9' })).toBeVisible();
    expect(screen.getByRole('tab', { name: 'Delivered, 4' })).toHaveAttribute(
      'aria-selected',
      'true',
    );

    await user.click(screen.getByRole('tab', { name: 'Exceptions, 2' }));

    expect(currentUrl()).toBe('/seller/shipments?view=exceptions');
    await waitFor(() =>
      expect(listUrls.at(-1)?.searchParams.get('view')).toBe('exceptions'),
    );
  });

  it('searches within the view, shows the search as a chip and clears it but keeps the view', async () => {
    resetNavigation('/seller/shipments?view=active&q=campinas');
    const user = userEvent.setup();
    renderWithQueryClient(<ShipmentsTable />);

    expect(await screen.findByText('No shipments match.')).toBeVisible();
    expect(listUrls.at(-1)?.searchParams.get('q')).toBe('campinas');

    await user.click(
      screen.getByRole('button', { name: 'Remove Search: campinas' }),
    );

    expect(currentUrl()).toBe('/seller/shipments?view=active');
    expect(screen.getByRole('searchbox')).toHaveValue('');
  });

  it('treats a status without a tab as a removable filter', async () => {
    resetNavigation('/seller/shipments?status=IN_TRANSIT&q=campinas');
    const user = userEvent.setup();
    renderWithQueryClient(<ShipmentsTable />);

    expect(
      await screen.findByRole('button', { name: 'Remove Status: In transit' }),
    ).toBeVisible();
    expect(await screen.findByText('No shipments match.')).toBeVisible();
    expect(screen.queryByRole('tab', { selected: true })).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Clear filters' }));

    expect(currentUrl()).toBe('/seller/shipments');
  });
});
