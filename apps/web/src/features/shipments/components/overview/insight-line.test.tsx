import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
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

const serve = (late: number, metrics: SellerMetrics) =>
  server.use(
    http.get(`${API_URL}/shipments/attention`, () =>
      HttpResponse.json({
        ...attention(
          Array.from({ length: late }, (_, i) =>
            shipment(`late-${i}`, 'IN_TRANSIT', -7),
          ),
          [],
        ),
        oldestLateDueAt: new Date(Date.now() - 7 * HOUR_MS).toISOString(),
      }),
    ),
    http.get(`${API_URL}/shipments/metrics`, () => HttpResponse.json(metrics)),
  );

const renderLine = () =>
  renderWithQueryClient(
    <InsightLine statsWindow="90d" poll={() => false} webhook={undefined} />,
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

  it('keeps the third sentence behind "1 more" until asked', async () => {
    serve(2, sellerMetrics());
    const user = userEvent.setup();
    renderLine();

    await user.click(await screen.findByRole('button', { name: '1 more' }));

    expect(screen.queryByRole('button', { name: '1 more' })).toBeNull();
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
