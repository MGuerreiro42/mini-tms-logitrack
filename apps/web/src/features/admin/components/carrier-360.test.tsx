import { screen, within } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { setSession } from '@/lib/session';
import { getSocket } from '@/services/websocket-client';
import { makeFakeSocket } from '@/test/fake-socket';
import { server } from '@/test/msw/server';
import { resetNavigation } from '@/test/navigation';
import { renderWithQueryClient } from '@/test/render';
import { Carrier360 } from './carrier-360';

vi.mock('@/services/websocket-client', async (importOriginal) => ({
  ...(await importOriginal()),
  getSocket: vi.fn(),
}));

const API_URL = 'http://localhost:3333';
const CARRIER = `${API_URL}/carriers/c-1`;

const carrier = (status: string) => ({
  id: 'c-1',
  email: 'carlos@demo.dev',
  companyName: 'Transportadora Demo',
  document: '41927305000162',
  status,
  userCount: 3,
  createdAt: '2026-10-01T10:00:00Z',
});

const performance = {
  totalShipments: 12,
  onTime: { n: 10, count: 9, rate: 90, trend: Array(12).fill(90) },
  medianDelivery: { hours: 30, n: 10 },
  firstAttempt: { rate: 80, n: 10, failed: 2, returned: 1 },
  claim: { p50Minutes: 3, p90Minutes: 45, n: 8 },
  stages: [
    { status: 'PENDING', p50Hours: 2, p90Hours: 4, budgetHours: 3, n: 8 },
  ],
};

function answer(status: string, total = 7) {
  server.use(
    http.get(CARRIER, () => HttpResponse.json(carrier(status))),
    http.get(`${CARRIER}/performance`, () => HttpResponse.json(performance)),
    http.get(`${CARRIER}/operator-ranking`, () =>
      HttpResponse.json([
        {
          carrierUserId: 'cu-1',
          name: 'Ana Souza',
          email: 'ana@demo.dev',
          role: 'OPERATOR',
          active: 2,
          claimed: 6,
          delivered: 5,
          onTime: { n: 5, count: 4, rate: 80 },
        },
      ]),
    ),
    http.get(`${CARRIER}/coverage-areas`, () =>
      HttpResponse.json([
        { id: 'a-1', state: 'SP', city: null },
        { id: 'a-2', state: 'RJ', city: 'Niterói' },
      ]),
    ),
    http.get(`${CARRIER}/modalities`, () =>
      HttpResponse.json([
        {
          id: 'm-1',
          code: 'STANDARD',
          name: 'Standard',
          slaHours: 72,
          enabled: true,
        },
        {
          id: 'm-2',
          code: 'EXPRESS',
          name: 'Express',
          slaHours: 24,
          enabled: false,
        },
      ]),
    ),
    http.get(`${API_URL}/admin/metrics`, () =>
      HttpResponse.json({ active: 4 }),
    ),
    http.get(`${API_URL}/admin/shipments`, () =>
      HttpResponse.json({
        data: [],
        meta: { total, page: 1, limit: 10, totalPages: 1 },
      }),
    ),
  );
}

describe('Carrier360', () => {
  beforeEach(() => {
    resetNavigation('/admin/carriers/c-1');
    setSession({ token: 't', role: 'ADMIN', userId: 'u', email: 'e' });
    vi.mocked(getSocket).mockReturnValue(makeFakeSocket() as never);
  });

  it("shows the manager's numbers and opens monitoring on Active now", async () => {
    answer('APPROVED');
    renderWithQueryClient(<Carrier360 id="c-1" />);

    expect(await screen.findByText('n=10 · target 90%')).toBeVisible();
    expect(screen.getByText('1.3 d')).toBeVisible();
    expect(screen.getByText('2 failed · 1 returned')).toBeVisible();
    expect(
      await screen.findByRole('link', {
        name: 'Active now, 4. View active shipments',
      }),
    ).toHaveAttribute('href', '/admin/monitoring?carrierId=c-1&view=active');
    expect(screen.getByText('Claim wait')).toBeVisible();
    expect(screen.getByText('3 users')).toBeVisible();
  });

  it('lists the team read-only, without a You row', async () => {
    answer('APPROVED');
    renderWithQueryClient(<Carrier360 id="c-1" />);

    const team = (await screen.findByRole('heading', { name: 'Team' })).closest(
      '[data-slot="card"]',
    ) as HTMLElement;
    expect(await within(team).findByText('Ana Souza')).toBeVisible();
    expect(within(team).queryByText('You')).toBeNull();
    expect(within(team).queryByRole('link')).toBeNull();
  });

  it('names the coverage and the enabled modalities with their SLA', async () => {
    answer('APPROVED');
    renderWithQueryClient(<Carrier360 id="c-1" />);

    const coverage = await screen.findByRole('list', { name: 'Coverage' });
    expect(coverage).toHaveTextContent('All of SP');
    expect(coverage).toHaveTextContent('Niterói/RJ');
    expect(screen.getByRole('list', { name: 'Modalities' })).toHaveTextContent(
      /^Standard · 72 h$/,
    );
  });

  it('says so instead of zero tiles when the carrier has no shipment', async () => {
    answer('APPROVED', 0);
    renderWithQueryClient(<Carrier360 id="c-1" />);

    expect(await screen.findByText('No shipments yet')).toBeVisible();
    expect(screen.queryByText('Median delivery')).toBeNull();
  });

  it('keeps the review and its actions for a pending carrier', async () => {
    answer('PENDING');
    renderWithQueryClient(<Carrier360 id="c-1" />);

    expect(
      await screen.findByRole('heading', { name: 'Company details' }),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: 'Approve' })).toBeVisible();
    expect(screen.queryByText('Team')).toBeNull();
  });
});
