import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { setSession } from '@/lib/session';
import { server } from '@/test/msw/server';
import { renderWithQueryClient } from '@/test/render';
import type { ShipmentStatusCounts } from '@/types/status';
import { AdminDashboard } from './admin-dashboard';

const API_URL = 'http://localhost:3333';

const shipmentCounts: ShipmentStatusCounts = {
  PENDING: 3,
  ACCEPTED: 4,
  COLLECTED: 5,
  IN_TRANSIT: 3,
  OUT_FOR_DELIVERY: 4,
  DELIVERED: 26,
  FAILED_DELIVERY: 2,
  RETURNED: 4,
  CANCELLED: 8,
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

  beforeEach(() => {
    approved = [];
    setSession({ token: 't', role: 'ADMIN', userId: 'u', email: 'e' });
    server.use(
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
    renderWithQueryClient(<AdminDashboard shipmentCounts={shipmentCounts} />);

    expect(
      await screen.findByText('2 applications waiting for review'),
    ).toBeInTheDocument();
    const list = await screen.findByRole('list', {
      name: 'Pending applications',
    });
    const rows = within(list).getAllByRole('listitem');
    expect(rows[0]).toHaveTextContent('Ateliê AuroraSeller');
    expect(rows[1]).toHaveTextContent('Rota Sul LogísticaCarrier');
    expect(screen.getByText('In progress').nextSibling).toHaveTextContent('19');
  });

  it('approves an application inline', async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<AdminDashboard shipmentCounts={shipmentCounts} />);

    const row = (await screen.findByText('Rota Sul Logística')).closest('li');
    await user.click(
      within(row as HTMLElement).getByRole('button', { name: 'Approve' }),
    );

    await vi.waitFor(() => expect(approved).toEqual(['c-1']));
  });
});
