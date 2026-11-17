import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { setSession } from '@/lib/session';
import { server } from '@/test/msw/server';
import { renderWithQueryClient } from '@/test/render';
import { API_URL, shipment } from './overview.fixtures';
import { ShipmentFlow } from './shipment-flow';

const counts = {
  PENDING: 1,
  ACCEPTED: 0,
  COLLECTED: 0,
  IN_TRANSIT: 3,
  OUT_FOR_DELIVERY: 0,
  DELIVERED: 9,
  FAILED_DELIVERY: 0,
  CANCELLED: 0,
  RETURNED: 0,
};

const SLA_TOTALS: Record<string, number> = {
  'on-track': 0,
  'due-soon': 0,
  late: 1,
};

// `totals` is what the lists behind the legend count, whatever the drawn page holds.
const listed = (data: unknown[], totals = SLA_TOTALS) =>
  server.use(
    http.get(`${API_URL}/shipments`, ({ request }) => {
      const url = new URL(request.url);
      const view = url.searchParams.get('view') ?? '';
      if (view === 'active') {
        expect(url.searchParams.get('limit')).toBe('100');
        return HttpResponse.json({
          data,
          meta: { total: data.length, page: 1, limit: 100, totalPages: 1 },
        });
      }
      return HttpResponse.json({
        data: [],
        meta: { total: totals[view], page: 1, limit: 1, totalPages: 1 },
      });
    }),
  );

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

describe('ShipmentFlow', () => {
  beforeEach(() => {
    setSession({ token: 't', role: 'SELLER', userId: 'u', email: 'a@b.c' });
  });

  it('draws one named mark per drawn shipment and counts the rest', async () => {
    listed([
      shipment('late', 'IN_TRANSIT', -6.5),
      shipment('soon', 'IN_TRANSIT', 2),
      shipment('pending', 'PENDING', 48),
    ]);
    renderWithQueryClient(<ShipmentFlow counts={counts} poll={() => false} />);

    const stage = await screen.findByRole('list', {
      name: 'In transit 3: 1 due soon, 1 late, 1 not drawn',
    });
    expect(
      within(stage).getByRole('link', {
        name: /^TMS-LATE, Bauru\/SP, Standard, Late 7 h, due /,
      }),
    ).toHaveAttribute('href', '/seller/shipments/late');
    expect(within(stage).getByLabelText('1 more not drawn')).toBeVisible();
    expect(screen.getByText('4 active · one dot per shipment')).toBeVisible();
  });

  it('links each legend count to the list of that state', async () => {
    listed([shipment('late', 'IN_TRANSIT', -7)], {
      'on-track': 3,
      'due-soon': 0,
      late: 1,
    });
    renderWithQueryClient(<ShipmentFlow counts={counts} poll={() => false} />);

    expect(await screen.findByRole('link', { name: 'Late 1' })).toHaveAttribute(
      'href',
      '/seller/shipments?view=late',
    );
    expect(screen.getByRole('link', { name: 'On track 3' })).toHaveAttribute(
      'href',
      '/seller/shipments?view=on-track',
    );
    expect(screen.getByRole('link', { name: 'Due soon 0' })).toHaveAttribute(
      'href',
      '/seller/shipments?view=due-soon',
    );
    expect(screen.queryByText('No SLA')).toBeNull();
  });

  it('counts the legend from the full data and says how many dots are drawn', async () => {
    const drawn = Array.from({ length: 100 }, (_, index) =>
      shipment(`s${index}`, 'IN_TRANSIT', 48),
    );
    listed(drawn, { 'on-track': 190, 'due-soon': 6, late: 4 });
    renderWithQueryClient(
      <ShipmentFlow
        counts={{ ...counts, IN_TRANSIT: 250 }}
        poll={() => false}
      />,
    );

    expect(
      await screen.findByRole('link', { name: 'On track 190' }),
    ).toBeVisible();
    expect(screen.getByRole('link', { name: 'Due soon 6' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Late 4' })).toBeVisible();
    expect(screen.getByText('No SLA')).toBeVisible();
    expect(
      screen.getByText('Showing the 100 most urgent of 251'),
    ).toBeVisible();
  });

  it('reaches every dot with one tab stop and names its details', async () => {
    const user = userEvent.setup();
    listed([shipment('a', 'IN_TRANSIT', 48), shipment('b', 'IN_TRANSIT', 50)]);
    renderWithQueryClient(<ShipmentFlow counts={counts} poll={() => false} />);
    const [first, second] = await screen.findAllByRole('link', {
      name: /^TMS-[AB], Bauru\/SP, Standard, On track, due /,
    });

    expect([first.tabIndex, second.tabIndex]).toEqual([0, -1]);
    first.focus();
    await user.keyboard('{ArrowRight}');
    expect(second).toHaveFocus();
    expect(await screen.findByRole('tooltip')).toHaveTextContent('TMS-B');
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('reads no open shipments without a bar', () => {
    listed([]);
    renderWithQueryClient(
      <ShipmentFlow
        counts={{ ...counts, PENDING: 0, IN_TRANSIT: 0 }}
        poll={() => false}
      />,
    );

    expect(screen.getByText('No open shipments.')).toBeVisible();
    expect(screen.queryByRole('list')).toBeNull();
  });
});
