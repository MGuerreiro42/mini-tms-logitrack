import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import type { SellerMetrics } from '@/features/shipments/types';
import { setSession } from '@/lib/session';
import { server } from '@/test/msw/server';
import { renderWithQueryClient } from '@/test/render';
import { API_URL, sellerMetrics } from './overview.fixtures';
import { PromiseVsReality } from './promise-vs-reality';

const stages: SellerMetrics['stages'] = [
  { status: 'PENDING', p50Hours: 1.5, p90Hours: 5, budgetHours: 7.2, n: 174 },
  { status: 'ACCEPTED', p50Hours: 9, p90Hours: 18, budgetHours: 14.4, n: 168 },
  { status: 'COLLECTED', p50Hours: 3, p90Hours: 9, budgetHours: 7.2, n: 2 },
];

const serve = (metrics: SellerMetrics) =>
  server.use(
    http.get(`${API_URL}/shipments/metrics`, () => HttpResponse.json(metrics)),
  );

const renderPanel = () =>
  renderWithQueryClient(
    <PromiseVsReality statsWindow="90d" poll={() => false} />,
  );

describe('PromiseVsReality', () => {
  beforeEach(() => {
    setSession({ token: 't', role: 'SELLER', userId: 'u', email: 'a@b.c' });
  });

  it('reads the promise and the reality with the median delivery on one axis', async () => {
    serve(sellerMetrics({ stages }));
    renderPanel();

    expect(
      await screen.findByRole('img', {
        name: 'Promise: Claim wait 7.2 h, Pickup wait 14.4 h, At origin 7.2 h. Reality, medians: Claim wait 1.5 h, Pickup wait 9 h. Median delivery 1.7 d of a 3 d SLA.',
      }),
    ).toBeVisible();
    expect(screen.getByText('1.7 d of a 3 d SLA')).toBeVisible();
  });

  it('flags the slow tail over budget and says why in one sentence', async () => {
    serve(sellerMetrics({ stages }));
    renderPanel();

    const tail = await screen.findByRole('table', {
      name: 'The slow tail: slowest 10% per stage',
    });
    const [, claim, pickup, origin] = within(tail).getAllByRole('row');
    expect(claim).toHaveTextContent('within');
    expect(pickup).toHaveTextContent('+3.6 h');
    expect(origin).toHaveTextContent('Not enough data (n=2)');
    expect(
      screen.getByText(
        'The typical shipment arrives with 1.3 d to spare; lateness lives in the tail of pickup wait.',
      ),
    ).toBeVisible();
  });

  it('makes the slow tail scroller a named, focusable region', async () => {
    serve(sellerMetrics({ stages }));
    renderPanel();

    const region = await screen.findByRole('region', {
      name: 'The slow tail table, scrollable',
    });
    expect(region).toHaveAttribute('tabindex', '0');
    expect(within(region).getByRole('table')).toBeVisible();
  });

  it('switches the chart to a table', async () => {
    serve(sellerMetrics({ stages }));
    const user = userEvent.setup();
    renderPanel();

    await user.click(
      await screen.findByRole('button', { name: 'View as table' }),
    );

    expect(
      screen.getByRole('row', { name: 'Pickup wait 14.4 h 9 h' }),
    ).toBeVisible();
  });
});
