import { screen, within } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import type { ShipmentAttention } from '@/features/shipments/types';
import { setSession } from '@/lib/session';
import { server } from '@/test/msw/server';
import { renderWithQueryClient } from '@/test/render';
import { ExceptionsPanel } from './exceptions-panel';
import { API_URL, attention, shipment } from './overview.fixtures';

const answer = (body: ShipmentAttention) =>
  server.use(
    http.get(`${API_URL}/shipments/attention`, () => HttpResponse.json(body)),
  );

const section = (name: string) =>
  screen.getByRole('heading', { name }).closest('section') as HTMLElement;

describe('ExceptionsPanel', () => {
  beforeEach(() => {
    setSession({ token: 't', role: 'SELLER', userId: 'u', email: 'a@b.c' });
  });

  it('groups the rows by cause, each with who acts and why', async () => {
    answer(
      attention(
        [shipment('late', 'IN_TRANSIT', -7, 72)],
        [shipment('failed', 'FAILED_DELIVERY', -2)],
      ),
    );
    renderWithQueryClient(
      <ExceptionsPanel poll={() => false} webhook={undefined} />,
    );

    expect(
      await screen.findByRole('heading', { name: 'Exceptions 2' }),
    ).toBeVisible();
    const late = section('Late 1');
    expect(within(late).getByText('Carrier must act')).toBeVisible();
    expect(
      within(late).getByText('Standard · In transit · 3.3 d of a 3 d SLA'),
    ).toBeVisible();
    expect(
      within(section('Failed attempt 1')).getByText('Recipient not at home'),
    ).toBeVisible();
    expect(
      screen.getByRole('link', { name: 'All exceptions' }),
    ).toHaveAttribute('href', '/seller/shipments?view=exceptions');
    expect(screen.getByText(/^Checked \d\d:\d\d/)).toBeVisible();
  });

  it('shows a group it does not know with its server label and owner', async () => {
    answer({
      ...attention([], []),
      groups: [
        {
          type: 'stalled',
          label: 'Stalled',
          owner: 'unknown',
          count: 1,
          href: '?view=stalled',
          items: [
            {
              shipment: shipment('stuck', 'COLLECTED', 10),
              since: new Date().toISOString(),
              reason: null,
            },
          ],
        },
      ],
    });
    renderWithQueryClient(
      <ExceptionsPanel poll={() => false} webhook={undefined} />,
    );

    expect(await screen.findByText('Owner unknown')).toBeVisible();
    expect(section('Stalled 1')).toHaveTextContent('Standard · Collected');
  });

  it('says so when nothing needs the seller', async () => {
    answer(attention([], []));
    renderWithQueryClient(
      <ExceptionsPanel poll={() => false} webhook={undefined} />,
    );

    expect(
      await screen.findByText('Nothing needs you right now.'),
    ).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Exceptions 0' })).toBeVisible();
  });
});
