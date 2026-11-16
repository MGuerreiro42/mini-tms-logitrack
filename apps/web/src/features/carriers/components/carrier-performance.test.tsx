import { act, screen, waitFor, within } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { setSession } from '@/lib/session';
import { getSocket } from '@/services/websocket-client';
import { makeFakeSocket } from '@/test/fake-socket';
import { server } from '@/test/msw/server';
import { resetNavigation } from '@/test/navigation';
import { renderWithQueryClient } from '@/test/render';
import type { CarrierPerformance as CarrierPerformanceData } from '../types';
import { CarrierPerformance } from './carrier-performance';

vi.mock('@/services/websocket-client', async (importOriginal) => ({
  ...(await importOriginal()),
  getSocket: vi.fn(),
}));

const API_URL = 'http://localhost:3333';

const stage = (status: string, n: number) => ({
  status,
  p50Hours: 2,
  p90Hours: 4,
  budgetHours: 3,
  n,
});

const performance = {
  totalShipments: 12,
  onTime: { n: 10, count: 9, rate: 90, trend: Array(12).fill(90) },
  medianDelivery: { hours: 30, n: 10 },
  firstAttempt: { rate: 80, n: 10, failed: 2, returned: 1 },
  claim: { p50Minutes: 3, p90Minutes: 45, n: 8 },
  stages: [stage('PENDING', 8), stage('ACCEPTED', 3)],
} as CarrierPerformanceData;

const member = (name: string, email: string, role: string) => ({
  carrierUserId: email,
  name,
  email,
  role,
  active: 2,
  claimed: 6,
  delivered: 5,
  onTime: { n: 5, count: 4, rate: 80 },
});

describe('CarrierPerformance', () => {
  beforeEach(() => {
    vi.mocked(getSocket).mockReturnValue(makeFakeSocket() as never);
    resetNavigation('/carrier/performance');
    setSession({
      token: 't',
      role: 'CARRIER_OPERATOR',
      userId: 'user-1',
      email: 'ana@example.com',
    });
    server.use(
      http.get(`${API_URL}/carriers/me/performance`, () =>
        HttpResponse.json(performance),
      ),
      http.get(`${API_URL}/carriers/me/operator-ranking`, () =>
        HttpResponse.json([
          member('Ana Souza', 'ana@example.com', 'OPERATOR'),
          member('Bruno Lima', 'bruno@example.com', 'OPERATOR'),
          member('Maria Gestora', 'maria@example.com', 'MANAGER'),
        ]),
      ),
    );
  });

  it('shows the four KPIs with their samples', async () => {
    renderWithQueryClient(<CarrierPerformance />);

    expect(await screen.findByText('n=10 · target 90%')).toBeVisible();
    expect(screen.getByText('1.3 d')).toBeVisible();
    expect(screen.getByText('2 failed · 1 returned')).toBeVisible();
    expect(screen.getByText('3 min')).toBeVisible();
    expect(screen.getByText('p90 45 min · n=8')).toBeVisible();
    expect(screen.getByText('Claim wait')).toBeVisible();
    expect(screen.getByText('Not enough data (n=3)')).toBeVisible();
  });

  it('lists the team by name, marks you and puts the manager under a divider', async () => {
    renderWithQueryClient(<CarrierPerformance />);

    const rows = within(
      (await screen.findByRole('heading', { name: 'Team' })).closest(
        '[data-slot="card"]',
      ) as HTMLElement,
    ).getAllByRole('row');
    expect(rows.map((row) => row.textContent)).toEqual([
      'NameActiveClaimedDeliveredOn time',
      'ASYou26580.0%',
      'BLBruno Lima26580.0%',
      'Manager',
      'MGMaria Gestora26580.0%',
    ]);
    expect(rows[1]).toHaveClass('bg-selected');
  });

  it('joins the queue room and refetches at most once per 10 s', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const socket = makeFakeSocket();
    vi.mocked(getSocket).mockReturnValue(socket as never);
    let calls = 0;
    server.use(
      http.get(`${API_URL}/carriers/me/performance`, () => {
        calls += 1;
        return HttpResponse.json(performance);
      }),
    );
    renderWithQueryClient(<CarrierPerformance />);
    await screen.findByText('n=10 · target 90%');
    act(() => socket.trigger('connect'));
    act(() => socket.ackAll({ ok: true }));
    // Live now, so no fallback polling; let the catch-up refetch's window pass.
    await act(() => vi.advanceTimersByTimeAsync(10_000));
    const settled = calls;

    act(() => {
      for (let i = 0; i < 3; i += 1) {
        socket.trigger('shipment:updated', { status: 'DELIVERED' });
      }
    });
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(calls - settled).toBe(1);
    await act(() => vi.advanceTimersByTimeAsync(10_000));
    expect(calls - settled).toBe(2);
    await act(() => vi.advanceTimersByTimeAsync(10_000));
    expect(calls - settled).toBe(2);
    expect(socket.emit.mock.calls.map(([event]) => event)).toContain(
      'subscribe:queue',
    );
    vi.useRealTimers();
  });

  it('keeps its two columns when the team fails', async () => {
    server.use(
      http.get(`${API_URL}/carriers/me/operator-ranking`, () =>
        HttpResponse.json({}, { status: 500 }),
      ),
    );
    renderWithQueryClient(<CarrierPerformance />);

    expect(await screen.findByText("Couldn't load the team.")).toBeVisible();
    expect(
      screen.getByRole('heading', { name: 'Time per stage' }),
    ).toBeVisible();
  });

  it('names the window when it holds no shipment', async () => {
    resetNavigation('/carrier/performance?window=7d');
    server.use(
      http.get(`${API_URL}/carriers/me/performance`, () =>
        HttpResponse.json({ ...performance, totalShipments: 0 }),
      ),
    );

    renderWithQueryClient(<CarrierPerformance />);

    expect(
      await screen.findByText('No shipments created in the last 7 d'),
    ).toBeVisible();
  });
});
