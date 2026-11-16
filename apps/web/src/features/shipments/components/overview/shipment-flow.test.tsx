import { screen, within } from '@testing-library/react';
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

const listed = (data: unknown[]) =>
  server.use(
    http.get(`${API_URL}/shipments`, ({ request }) => {
      const url = new URL(request.url);
      expect(url.searchParams.get('view')).toBe('active');
      expect(url.searchParams.get('limit')).toBe('100');
      return HttpResponse.json({
        data,
        meta: { total: data.length, page: 1, limit: 100, totalPages: 1 },
      });
    }),
  );

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
      name: 'In transit 3: 1 due soon, 1 late',
    });
    expect(
      within(stage).getByRole('link', {
        name: /^TMS-LATE, Bauru\/SP, Late 7 h$/,
      }),
    ).toHaveAttribute('href', '/seller/shipments/late');
    expect(within(stage).getByText('+1')).toBeVisible();
    expect(screen.getByText('4 active · one dot per shipment')).toBeVisible();
  });

  it('links each legend count to the list of that state', async () => {
    listed([shipment('late', 'IN_TRANSIT', -7)]);
    renderWithQueryClient(<ShipmentFlow counts={counts} poll={() => false} />);

    expect(await screen.findByRole('link', { name: 'Late 1' })).toHaveAttribute(
      'href',
      '/seller/shipments?view=late',
    );
    expect(screen.getByRole('link', { name: 'On track 0' })).toHaveAttribute(
      'href',
      '/seller/shipments?view=on-track',
    );
    expect(screen.getByRole('link', { name: 'Due soon 0' })).toHaveAttribute(
      'href',
      '/seller/shipments?view=due-soon',
    );
    expect(screen.queryByText('No SLA')).toBeNull();
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
