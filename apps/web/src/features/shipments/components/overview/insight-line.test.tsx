import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import type { WebhookHealth } from '@/features/integrations/types';
import type { SellerMetrics } from '@/features/shipments/types';
import { setSession } from '@/lib/session';
import { server } from '@/test/msw/server';
import { renderWithQueryClient } from '@/test/render';
import { InsightLine } from './insight-line';
import {
  API_URL,
  attention,
  HOUR_MS,
  sellerMetrics,
  shipment,
} from './overview.fixtures';

const serve = (late: number, metrics: SellerMetrics, waiting = 0) =>
  server.use(
    http.get(`${API_URL}/shipments/attention`, () => {
      const base = attention(
        Array.from({ length: late }, (_, i) =>
          shipment(`late-${i}`, 'IN_TRANSIT', -7),
        ),
        [],
      );
      return HttpResponse.json({
        ...base,
        counts: { ...base.counts, waiting },
        oldestLateDueAt: new Date(Date.now() - 7 * HOUR_MS).toISOString(),
      });
    }),
    http.get(`${API_URL}/shipments/metrics`, () => HttpResponse.json(metrics)),
  );

const renderLine = (webhook?: WebhookHealth) =>
  renderWithQueryClient(
    <InsightLine statsWindow="90d" poll={() => false} webhook={webhook} />,
  );

describe('InsightLine', () => {
  beforeEach(() => {
    setSession({ token: 't', role: 'SELLER', userId: 'u', email: 'a@b.c' });
  });

  it('leads with Delivery health, then each fired sentence as a link with its rule', async () => {
    serve(2, sellerMetrics());
    renderLine();

    expect(
      await screen.findByText('· held back by on time 91.3% (n=150)'),
    ).toBeVisible();
    const late = await screen.findByRole('link', { name: /^2 late, oldest/ });
    expect(late).toHaveAttribute('href', '/seller/shipments?view=late');
    expect(late).toHaveTextContent('rule: late now > 0');
    expect(screen.getAllByRole('link')).toHaveLength(3);
  });

  it('keeps the third sentence behind a real disclosure that holds focus', async () => {
    serve(2, sellerMetrics());
    const user = userEvent.setup();
    renderLine();
    const sentence = (
      await screen.findByRole('link', { name: /^On time up/ })
    ).closest('li');

    const more = await screen.findByRole('button', { name: '1 more' });
    expect(more).toHaveAttribute('aria-expanded', 'false');
    expect(sentence).toHaveClass('@max-[600px]:hidden');

    await user.click(more);

    const fewer = screen.getByRole('button', { name: 'Show fewer' });
    expect(fewer).toHaveFocus();
    expect(fewer).toHaveAttribute('aria-expanded', 'true');
    expect(sentence).not.toHaveClass('@max-[600px]:hidden');

    await user.click(fewer);
    expect(screen.getByRole('button', { name: '1 more' })).toHaveFocus();
    expect(sentence).toHaveClass('@max-[600px]:hidden');
  });

  it('draws at most three sentences when four rules fire', async () => {
    serve(2, sellerMetrics(), 3);
    renderLine({
      state: 'down',
      n: 10,
      successRate: 50,
      p95Ms: 200,
      lastSuccessAt: null,
      failingSince: null,
    });

    expect(await screen.findByRole('link', { name: /^2 late/ })).toBeVisible();
    expect(screen.getAllByRole('link')).toHaveLength(3);
    expect(screen.getByRole('link', { name: /^Webhooks down/ })).toBeVisible();
    expect(
      screen.getByRole('link', { name: /waiting for a carrier/ }),
    ).toBeVisible();
    expect(screen.queryByRole('link', { name: /^PR trails/ })).toBeNull();
    expect(screen.getByRole('button', { name: '1 more' })).toBeVisible();
  });

  it('says it is checking the trends, not that history is thin, while metrics load', async () => {
    serve(0, sellerMetrics());
    server.use(
      http.get(`${API_URL}/shipments/metrics`, async () => {
        await new Promise(() => {});
      }),
    );
    renderLine();

    expect(
      await screen.findByText('Checking your delivery trends…'),
    ).toBeVisible();
    expect(screen.queryByText(/Not enough history/)).toBeNull();
    expect(screen.queryByText(/Nothing needs you/)).toBeNull();
  });

  it('says the trends failed to load, keeping the sentences that need no metrics', async () => {
    serve(2, sellerMetrics());
    server.use(
      http.get(`${API_URL}/shipments/metrics`, () =>
        HttpResponse.json({}, { status: 500 }),
      ),
    );
    renderLine();

    expect(
      await screen.findByText("Couldn't load your delivery trends."),
    ).toBeVisible();
    expect(screen.getByRole('link', { name: /^2 late/ })).toBeVisible();
    expect(screen.queryByText(/Not enough history/)).toBeNull();
  });

  it('reads quiet when no rule fires', async () => {
    serve(
      0,
      sellerMetrics({
        byState: [],
        comparison: { ...sellerMetrics().comparison, mature: false },
      }),
    );
    renderLine();

    expect(
      await screen.findByText(
        /^Nothing needs you right now · Checked \d\d:\d\d against 6 rules$/,
      ),
    ).toBeVisible();
  });

  it('says the history is thin and that only the now rules run', async () => {
    serve(0, sellerMetrics({ shipments: 3, delivered: 3 }));
    renderLine();

    expect(
      await screen.findByText(
        'Not enough history to call trends yet · Only "late" and "webhooks" rules run (n = 3)',
      ),
    ).toBeVisible();
    expect(screen.getByText('Building your score')).toBeVisible();
  });
});
