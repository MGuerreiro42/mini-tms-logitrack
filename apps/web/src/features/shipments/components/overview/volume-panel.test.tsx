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

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

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
    expect([first, second].map((column) => column.tabIndex)).toEqual([0, -1]);
    expect(screen.getByText('(3 failed · 6 returned)')).toBeVisible();
    expect(
      screen.getByText(
        'By creation date, coloured by status now. 5 cancelled not shown.',
      ),
    ).toBeVisible();
  });

  it('reads a small count on a whole-number axis', async () => {
    serve(
      sellerMetrics({
        volume: {
          bucket: 'day',
          points: [
            {
              start: '2026-08-13T03:00:00.000Z',
              delivered: 1,
              problem: 0,
              open: 0,
            },
            {
              start: '2026-08-14T03:00:00.000Z',
              delivered: 2,
              problem: 0,
              open: 0,
            },
          ],
        },
      }),
    );
    const { container } = renderPanel();

    await screen.findByRole('list', { name: /^Shipments created per day/ });
    const ticks = [...container.querySelectorAll('[aria-hidden] > span')]
      .map((tick) => tick.textContent ?? '')
      .filter((text) => /^[\d.]+$/.test(text));
    expect(ticks).toEqual(['0', '1', '2', '3', '4']);
  });

  it('moves between columns with the arrows and closes the tooltip with Escape', async () => {
    serve(sellerMetrics());
    const user = userEvent.setup();
    renderPanel();
    const chart = await screen.findByRole('list', {
      name: /^Shipments created per week/,
    });
    const [first, second] = within(chart).getAllByRole('listitem');

    first.focus();
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Aug 13: 11');
    await user.keyboard('{ArrowRight}');
    expect(second).toHaveFocus();
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('tooltip')).toBeNull();
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
