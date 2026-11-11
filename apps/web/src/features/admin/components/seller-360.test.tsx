import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { setSession } from '@/lib/session';
import { getSocket } from '@/services/websocket-client';
import { makeFakeSocket } from '@/test/fake-socket';
import { server } from '@/test/msw/server';
import { resetNavigation } from '@/test/navigation';
import { renderWithQueryClient } from '@/test/render';
import { Seller360 } from './seller-360';

vi.mock('@/services/websocket-client', async (importOriginal) => ({
  ...(await importOriginal()),
  getSocket: vi.fn(),
}));

const API_URL = 'http://localhost:3333';

const seller = (status: string) => ({
  id: 's-1',
  email: 'loja@demo.dev',
  companyName: 'Loja Demo',
  document: '41927305000162',
  status,
  createdAt: '2026-10-01T10:00:00Z',
});

const shipment = {
  id: 'shipment-1',
  trackingCode: 'TMS-AAA111',
  status: 'IN_TRANSIT',
  carrierName: 'Transportadora Demo',
  addressCity: 'Campinas',
  addressState: 'SP',
  dueAt: null,
  deliveredAt: null,
  createdAt: '2026-11-01T00:00:00.000Z',
};

const metrics = {
  shipments: 14,
  active: 6,
  lateNow: 2,
  onTime: { n: 8, count: 6, rate: 75, trend: Array(12).fill(75) },
  medianDelivery: { hours: 30, n: 8 },
  firstAttempt: { rate: 90, n: 10, failed: 1, returned: 0 },
  claim: { p50Minutes: 12, p90Minutes: 40, n: 9 },
  byCarrier: [],
};

const counts = {
  PENDING: 2,
  ACCEPTED: 0,
  COLLECTED: 0,
  IN_TRANSIT: 4,
  OUT_FOR_DELIVERY: 0,
  DELIVERED: 8,
  FAILED_DELIVERY: 0,
  CANCELLED: 0,
  RETURNED: 0,
};

function answer(status: string, total = 23) {
  server.use(
    http.get(`${API_URL}/sellers/s-1`, () => HttpResponse.json(seller(status))),
    http.get(`${API_URL}/admin/metrics`, () => HttpResponse.json(metrics)),
    http.get(`${API_URL}/admin/shipments/status-counts`, () =>
      HttpResponse.json(counts),
    ),
    http.get(`${API_URL}/admin/shipments`, () =>
      HttpResponse.json({
        data: total ? [shipment] : [],
        meta: { total, page: 1, limit: 10, totalPages: 3 },
      }),
    ),
    http.get(`${API_URL}/sellers/s-1/modalities`, () =>
      HttpResponse.json([
        { id: 'm-1', code: 'STANDARD', name: 'Standard', enabled: true },
        { id: 'm-2', code: 'EXPRESS', name: 'Express', enabled: false },
      ]),
    ),
  );
}

describe('Seller360', () => {
  beforeEach(() => {
    resetNavigation('/admin/sellers/s-1');
    setSession({ token: 't', role: 'ADMIN', userId: 'u', email: 'e' });
    vi.mocked(getSocket).mockReturnValue(makeFakeSocket() as never);
  });

  it('opens monitoring on exactly each count tile for an approved seller', async () => {
    answer('APPROVED');
    renderWithQueryClient(<Seller360 id="s-1" />);

    expect(
      await screen.findByRole('link', {
        name: 'Shipments 30 d, 14. View in Monitoring',
      }),
    ).toHaveAttribute(
      'href',
      '/admin/monitoring?sellerId=s-1&view=ALL&window=30d',
    );
    expect(
      screen.getByRole('link', {
        name: 'Active now, 6. View active shipments',
      }),
    ).toHaveAttribute('href', '/admin/monitoring?sellerId=s-1&view=active');
    expect(
      screen.getByRole('link', { name: 'Late now, 2. View late shipments' }),
    ).toHaveAttribute('href', '/admin/monitoring?sellerId=s-1&view=late');
    expect(screen.getByText('75.0%')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Copy tax ID' })).toBeVisible();
    expect(
      screen.getByRole('radiogroup', { name: 'Time window' }),
    ).toBeVisible();
  });

  it('shows the recent shipments, the status bar and the enabled modalities', async () => {
    answer('APPROVED');
    renderWithQueryClient(<Seller360 id="s-1" />);

    expect(
      await screen.findByRole('link', { name: 'All 23 in Monitoring →' }),
    ).toHaveAttribute('href', '/admin/monitoring?sellerId=s-1');
    expect(
      await screen.findByRole('link', { name: 'TMS-AAA111' }),
    ).toHaveAttribute('href', '/admin/shipments/shipment-1');
    expect(await screen.findByText('Status · 30 d')).toBeVisible();
    const modalities = await screen.findByRole('list', {
      name: 'Modalities',
    });
    expect(
      within(modalities)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(['StandardEnabled', 'ExpressOff']);
  });

  it('says so instead of zero tiles when the seller has no shipment', async () => {
    answer('APPROVED', 0);
    renderWithQueryClient(<Seller360 id="s-1" />);

    expect(await screen.findByText('No shipments yet')).toBeVisible();
    expect(screen.queryByText('Active')).toBeNull();
    expect(screen.queryByRole('link', { name: /Shipments 30 d/ })).toBeNull();
  });

  it('keeps the review for a pending seller, then focuses the 360 title on approval', async () => {
    let approved = false;
    answer('PENDING');
    server.use(
      http.get(`${API_URL}/sellers/s-1`, () =>
        HttpResponse.json(seller(approved ? 'APPROVED' : 'PENDING')),
      ),
      http.patch(`${API_URL}/sellers/s-1/approve`, () => {
        approved = true;
        return HttpResponse.json(seller('APPROVED'));
      }),
    );
    const user = userEvent.setup();
    renderWithQueryClient(<Seller360 id="s-1" />);

    expect(await screen.findByText('Company details')).toBeVisible();
    expect(screen.queryByText('Status · 30 d')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Approve' }));

    await vi.waitFor(() => expect(approved).toBe(true));
    const title = await screen.findByRole('heading', { level: 1 });
    await vi.waitFor(() =>
      expect(title).toContainElement(document.activeElement as HTMLElement),
    );
    expect(screen.queryByText('Company details')).toBeNull();
  });
});
