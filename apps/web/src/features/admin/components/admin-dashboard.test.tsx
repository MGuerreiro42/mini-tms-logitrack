import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { setSession } from '@/lib/session';
import { getSocket } from '@/services/websocket-client';
import { makeFakeSocket } from '@/test/fake-socket';
import { server } from '@/test/msw/server';
import { resetNavigation } from '@/test/navigation';
import { renderWithQueryClient } from '@/test/render';
import { AdminDashboard } from './admin-dashboard';

vi.mock('@/services/websocket-client', async (importOriginal) => ({
  ...(await importOriginal()),
  getSocket: vi.fn(),
}));

const API_URL = 'http://localhost:3333';

const metrics = {
  shipments: 40,
  active: 9,
  lateNow: 2,
  onTime: { n: 20, count: 18, rate: 90, trend: Array(12).fill(90) },
  medianDelivery: { hours: 30, n: 20 },
  firstAttempt: { rate: 85, n: 20, failed: 3, returned: 1 },
  claim: { p50Minutes: 12, p90Minutes: 90, n: 30 },
  byCarrier: [
    {
      carrierId: 'c-9',
      companyName: 'Transportadora Demo',
      n: 20,
      count: 18,
      rate: 90,
    },
    { carrierId: 'c-8', companyName: 'Rápida', n: 3, count: 3, rate: 100 },
  ],
};

function company(id: string, companyName: string, createdAt: string) {
  return {
    id,
    companyName,
    document: '41.927.305/0001-62',
    email: `${id}@example.com`,
    status: 'PENDING',
    userCount: 1,
    createdAt,
  };
}

function page(data: unknown[]) {
  return {
    data,
    meta: { total: data.length, page: 1, limit: 5, totalPages: 1 },
  };
}

describe('AdminDashboard', () => {
  let approved: string[];
  let metricsWindows: (string | null)[];

  beforeEach(() => {
    approved = [];
    metricsWindows = [];
    resetNavigation('/admin');
    setSession({ token: 't', role: 'ADMIN', userId: 'u', email: 'e' });
    vi.mocked(getSocket).mockReturnValue(makeFakeSocket() as never);
    server.use(
      http.get(`${API_URL}/admin/metrics`, ({ request }) => {
        metricsWindows.push(new URL(request.url).searchParams.get('window'));
        return HttpResponse.json(metrics);
      }),
      http.get(`${API_URL}/sellers/status-counts`, () =>
        HttpResponse.json({ PENDING: 1, APPROVED: 2, REJECTED: 0 }),
      ),
      http.get(`${API_URL}/carriers/status-counts`, () =>
        HttpResponse.json({ PENDING: 1, APPROVED: 1, REJECTED: 0 }),
      ),
      http.get(`${API_URL}/sellers`, () =>
        HttpResponse.json(
          page([company('s-1', 'Ateliê Aurora', '2026-10-14T10:00:00Z')]),
        ),
      ),
      http.get(`${API_URL}/carriers`, () =>
        HttpResponse.json(
          page([company('c-1', 'Rota Sul Logística', '2026-10-13T10:00:00Z')]),
        ),
      ),
      http.patch(`${API_URL}/carriers/:id/approve`, ({ params }) => {
        approved.push(String(params.id));
        return HttpResponse.json({});
      }),
    );
  });

  it('leads with the applications waiting for review, newest first', async () => {
    renderWithQueryClient(<AdminDashboard />);

    expect(
      await screen.findByText('2 applications waiting for review'),
    ).toBeInTheDocument();
    const list = await screen.findByRole('list', {
      name: 'Pending applications',
    });
    const rows = within(list).getAllByRole('listitem');
    expect(rows[0]).toHaveTextContent('Ateliê AuroraSeller');
    expect(rows[1]).toHaveTextContent('Rota Sul LogísticaCarrier');
    // Approved tenants only: the pending ones are the list above.
    expect(screen.getByText('2 sellers · 1 carrier')).toBeVisible();
  });

  it('shows the platform tiles and on time per carrier for the window', async () => {
    renderWithQueryClient(<AdminDashboard />);

    expect(
      await screen.findByRole('link', {
        name: 'Late now, 2. View late shipments',
      }),
    ).toHaveAttribute('href', '/admin/monitoring?view=late');
    expect(screen.getByText('15.0%')).toBeVisible();
    expect(screen.getByText('3 failed · 1 returned')).toBeVisible();
    expect(screen.getByText('12 min')).toBeVisible();
    expect(
      screen.getByRole('link', { name: 'Transportadora Demo' }),
    ).toHaveAttribute('href', '/admin/carriers/c-9');
    expect(screen.getByText('Not enough deliveries (n=3)')).toBeVisible();
    expect(screen.queryByText('Status distribution')).toBeNull();
    expect(metricsWindows).toEqual(['30d']);
  });

  it('approves an application inline', async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<AdminDashboard />);

    const row = (await screen.findByText('Rota Sul Logística')).closest('li');
    await user.click(
      within(row as HTMLElement).getByRole('button', { name: 'Approve' }),
    );

    await vi.waitFor(() => expect(approved).toEqual(['c-1']));
  });

  it('keeps the approvals when the metrics fail', async () => {
    server.use(
      http.get(`${API_URL}/admin/metrics`, () =>
        HttpResponse.json({}, { status: 500 }),
      ),
    );
    renderWithQueryClient(<AdminDashboard />);

    expect(
      (await screen.findAllByText("Couldn't load platform metrics.")).length,
    ).toBeGreaterThan(0);
    expect(await screen.findByText('Rota Sul Logística')).toBeInTheDocument();
  });

  it('says so when the approval counts fail, keeping the metrics', async () => {
    server.use(
      http.get(`${API_URL}/sellers/status-counts`, () =>
        HttpResponse.json({}, { status: 500 }),
      ),
    );
    renderWithQueryClient(<AdminDashboard />);

    expect(
      await screen.findByText(
        "Couldn't load the applications waiting for review.",
      ),
    ).toBeVisible();
    expect(
      screen.getByRole('link', { name: 'Late now, 2. View late shipments' }),
    ).toBeVisible();
  });
});
