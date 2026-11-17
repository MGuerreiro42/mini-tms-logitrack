import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import type { SellerMetrics } from '@/features/shipments/types';
import { setSession } from '@/lib/session';
import { server } from '@/test/msw/server';
import { renderWithQueryClient } from '@/test/render';
import { API_URL, sellerMetrics } from './overview.fixtures';
import { VolumePanel } from './volume-panel';

const serve = (metrics: SellerMetrics) =>
  server.use(
    http.get(`${API_URL}/shipments/metrics`, () => HttpResponse.json(metrics)),
  );

const renderPanel = () =>
  renderWithQueryClient(<VolumePanel statsWindow="90d" poll={() => false} />);

describe('VolumePanel', () => {
  beforeEach(() => {
    setSession({ token: 't', role: 'SELLER', userId: 'u', email: 'a@b.c' });
  });

  it('stacks each week by status now, with totals and a spoken summary', async () => {
    serve(sellerMetrics());
    renderPanel();

    const chart = await screen.findByRole('list', {
      name: 'Shipments created per week: 11, 16',
    });
    const [first, second] = within(chart).getAllByRole('listitem');
    expect(first).toHaveAccessibleName(
      'Aug 13: 11 — Delivered 10 · Open 0 · Problem 1',
    );
    expect(second).toHaveAttribute('tabindex', '0');
    expect(screen.getByText('(3 failed · 6 returned)')).toBeVisible();
    expect(
      screen.getByText(
        'By creation date, coloured by status now. 5 cancelled not shown.',
      ),
    ).toBeVisible();
  });

  it('switches to a table of the same numbers', async () => {
    serve(sellerMetrics());
    const user = userEvent.setup();
    renderPanel();

    await user.click(
      await screen.findByRole('button', { name: 'View as table' }),
    );

    expect(screen.getByRole('row', { name: 'Aug 20 7 9 0 16' })).toBeVisible();
  });

  it('waits for 5 shipments before drawing an axis', async () => {
    serve(sellerMetrics({ shipments: 3 }));
    renderPanel();

    expect(
      await screen.findByText(
        'Volume shows once you have 5 shipments in this window.',
      ),
    ).toBeVisible();
    expect(screen.queryByRole('list')).toBeNull();
  });
});
