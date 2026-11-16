import { screen, waitFor, within } from '@testing-library/react';
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
  let viewCountUrls: URL[] = [];

  beforeEach(() => {
    listUrls = [];
    viewCountUrls = [];
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
      http.get(`${API_URL}/shipments/view-counts`, ({ request }) => {
        viewCountUrls.push(new URL(request.url));
        return HttpResponse.json({
          active: 3,
          late: 1,
          exceptions: 2,
          done: 5,
        });
      }),
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

  it('narrows the list and its counts to the window chip, removable', async () => {
    resetNavigation('/seller/shipments?view=late&window=7d');
    const user = userEvent.setup();
    renderWithQueryClient(<ShipmentsTable />);

    expect(await screen.findByRole('tab', { name: 'Late, 1' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(listUrls.at(-1)?.searchParams.get('window')).toBe('7d');
    expect(viewCountUrls.at(-1)?.searchParams.get('window')).toBe('7d');

    await user.click(
      screen.getByRole('button', {
        name: 'Remove Created in the last 7 d',
      }),
    );

    expect(currentUrl()).toBe('/seller/shipments?view=late');
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

  it('peeks at the shipment named in the URL', async () => {
    const shipment = {
      id: 'shipment-1',
      trackingCode: 'TMS-AAA111',
      status: 'IN_TRANSIT',
      addressCity: 'Campinas',
      addressState: 'SP',
      addressNeighborhood: 'Centro',
      carrierName: 'Fast Carrier',
      modalityName: 'Express',
      createdAt: '2026-11-01T12:00:00.000Z',
      dueAt: null,
      trackingEvents: [],
    };
    server.use(
      http.get(`${API_URL}/shipments/shipment-1`, () =>
        HttpResponse.json(shipment),
      ),
    );
    resetNavigation('/seller/shipments?peek=shipment-1');
    renderWithQueryClient(<ShipmentsTable />);

    const sheet = await screen.findByRole('dialog', {
      name: 'Shipment preview',
    });
    expect(await within(sheet).findByText('Fast Carrier')).toBeVisible();
    expect(
      within(sheet).getByRole('link', { name: 'Open shipment' }),
    ).toHaveAttribute('href', '/seller/shipments/shipment-1');
  });

  it('cancels the cancellable part of a selection, at most 4 at a time', async () => {
    const row = (n: number, status: string) => ({
      id: `s-${n}`,
      trackingCode: `TMS-00${n}`,
      status,
      addressCity: 'Campinas',
      addressState: 'SP',
      createdAt: '2026-11-01T12:00:00.000Z',
      dueAt: null,
    });
    const rows = [
      ...[1, 2, 3, 4, 5, 6].map((n) => row(n, 'PENDING')),
      row(7, 'IN_TRANSIT'),
      row(8, 'OUT_FOR_DELIVERY'),
    ];
    let inFlight = 0;
    let peak = 0;
    const cancelled: string[] = [];
    server.use(
      http.get(`${API_URL}/shipments`, () =>
        HttpResponse.json({
          data: rows,
          meta: { total: 8, page: 1, limit: 20, totalPages: 1 },
        }),
      ),
      http.patch(`${API_URL}/shipments/:id/cancel`, async ({ params }) => {
        peak = Math.max(peak, ++inFlight);
        await new Promise((resolve) => setTimeout(resolve, 20));
        inFlight -= 1;
        // Collected meanwhile: the existing endpoint's 409.
        if (params.id === 's-6') {
          return HttpResponse.json({ message: 'Collected' }, { status: 409 });
        }
        cancelled.push(params.id as string);
        return HttpResponse.json({});
      }),
    );
    resetNavigation('/seller/shipments');
    const user = userEvent.setup();
    renderWithQueryClient(<ShipmentsTable />);

    await user.click(
      await screen.findByRole('checkbox', { name: 'Select all on this page' }),
    );
    const bar = screen.getByRole('region', { name: 'Bulk actions' });
    expect(bar).toHaveTextContent('8 selected');
    await user.click(within(bar).getByRole('button', { name: 'Cancel 6…' }));
    expect(
      screen.getByText(
        "2 can't be cancelled at this stage. The carrier is told and the shipments leave its queue.",
      ),
    ).toBeVisible();
    await user.click(
      screen.getByRole('button', { name: 'Cancel 6 shipments' }),
    );

    await waitFor(() => expect(cancelled).toHaveLength(5));
    expect(peak).toBe(4);
    expect(cancelled).not.toContain('s-7');
    // The failed one stays selected for a retry; clearing returns focus to select-all.
    const remaining = await screen.findByRole('region', {
      name: 'Bulk actions',
    });
    await waitFor(() => expect(remaining).toHaveTextContent('1 selected'));
    expect(
      screen.getByRole('checkbox', { name: 'Select all on this page' }),
    ).toHaveProperty('indeterminate', true);
    await user.click(
      within(remaining).getByRole('button', { name: 'Clear selection' }),
    );
    expect(
      screen.getByRole('checkbox', { name: 'Select all on this page' }),
    ).toHaveFocus();
  });
});
