import { act, screen, waitFor } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { getPublicSocket } from '@/services/websocket-client';
import { mapProps } from '@/test/delivery-map-stub';
import { makeFakeSocket } from '@/test/fake-socket';
import { server } from '@/test/msw/server';
import { renderWithQueryClient } from '@/test/render';
import type { PublicTracking } from '../types';
import { PublicTrackingDetails } from './public-tracking-details';

vi.mock('@/services/websocket-client', async (importOriginal) => ({
  ...(await importOriginal()),
  getPublicSocket: vi.fn(),
}));

vi.mock('./lazy-delivery-map', () => import('@/test/delivery-map-stub'));

const API_URL = 'http://localhost:3333';

const tracking: PublicTracking = {
  trackingCode: 'TMS-AAA111',
  status: 'ACCEPTED',
  addressCity: 'São Paulo',
  addressState: 'SP',
  modalityName: 'Standard',
  events: [{ status: 'ACCEPTED', createdAt: '2026-01-01T00:00:00.000Z' }],
  map: null,
  lastPosition: null,
};

const inTransit: PublicTracking = {
  ...tracking,
  status: 'IN_TRANSIT',
  map: {
    route: [
      [-46.9, -23.3],
      [-46.7, -23.5],
    ],
    city: 'São Paulo',
    cityCenter: [-46.63, -23.55],
  },
  lastPosition: {
    lat: -23.4,
    lng: -46.8,
    heading: null,
    recordedAt: '2026-01-02T00:00:00.000Z',
  },
};

function serveTracking(data: PublicTracking) {
  server.use(
    http.get(`${API_URL}/public/tracking/TMS-AAA111`, () =>
      HttpResponse.json(data),
    ),
  );
}

describe('PublicTrackingDetails', () => {
  let socket: ReturnType<typeof makeFakeSocket>;

  beforeEach(() => {
    socket = makeFakeSocket();
    vi.mocked(getPublicSocket).mockReturnValue(socket as never);
    serveTracking(tracking);
  });

  it('subscribes to the tracking room and goes live once the server acks', async () => {
    renderWithQueryClient(<PublicTrackingDetails initialData={tracking} />);

    expect(screen.getByRole('status')).toHaveTextContent('Connecting…');
    act(() => socket.trigger('connect'));

    const [event, code] = socket.emit.mock.calls[0];
    expect(event).toBe('subscribe:tracking');
    expect(code).toBe('TMS-AAA111');
    await act(async () => socket.ackAll({ ok: true }));

    expect(screen.getByRole('status')).toHaveTextContent('Live');
  });

  it('refetches and shows the new status on tracking:updated', async () => {
    renderWithQueryClient(<PublicTrackingDetails initialData={tracking} />);
    serveTracking({
      ...tracking,
      status: 'COLLECTED',
      events: [
        ...tracking.events,
        { status: 'COLLECTED', createdAt: '2026-01-02T00:00:00.000Z' },
      ],
    });

    act(() =>
      socket.trigger('tracking:updated', {
        trackingCode: 'TMS-AAA111',
        status: 'COLLECTED',
      }),
    );

    await waitFor(() =>
      expect(document.title).toBe('TMS-AAA111 · Collected · Mini TMS'),
    );
  });

  it('tells the visitor it fell back to refreshing when the socket drops', async () => {
    renderWithQueryClient(<PublicTrackingDetails initialData={tracking} />);
    act(() => socket.trigger('connect'));
    await act(async () => socket.ackAll({ ok: true }));

    act(() => socket.trigger('disconnect'));

    expect(screen.getByText(/refresh every few seconds/i)).toBeInTheDocument();
    // The indicator rides out a one-second blip before reading Offline.
    await waitFor(
      () => expect(screen.getByRole('status')).toHaveTextContent('Offline'),
      { timeout: 2000 },
    );
  });

  it('disconnects on unmount', () => {
    const { unmount } = renderWithQueryClient(
      <PublicTrackingDetails initialData={tracking} />,
    );

    unmount();

    expect(socket.disconnect).toHaveBeenCalled();
  });

  describe('live map', () => {
    it('shows the city area and the vehicle in transit, never the address', async () => {
      serveTracking(inTransit);
      renderWithQueryClient(<PublicTrackingDetails initialData={inTransit} />);

      const element = await screen.findByTestId('delivery-map');
      const props = mapProps(element);
      expect(props).toMatchObject({
        route: inTransit.map?.route,
        area: { center: [-46.63, -23.55], city: 'São Paulo' },
        stage: 'IN_TRANSIT',
        position: inTransit.lastPosition,
        caption: 'On the way to São Paulo',
      });
      expect(props).not.toHaveProperty('destination');
      expect(props).not.toHaveProperty('splitIndex');
      expect(element.dataset.props).not.toMatch(/destination/i);
      expect(document.body).not.toHaveTextContent(/destination/i);
    });

    it('drops the vehicle out for delivery even when a position is cached', async () => {
      const outForDelivery = {
        ...inTransit,
        status: 'OUT_FOR_DELIVERY' as const,
      };
      serveTracking(outForDelivery);
      renderWithQueryClient(
        <PublicTrackingDetails initialData={outForDelivery} />,
      );

      expect(mapProps(await screen.findByTestId('delivery-map'))).toMatchObject(
        {
          stage: 'OUT_FOR_DELIVERY',
          position: null,
          caption: 'Out for delivery in São Paulo',
        },
      );
    });

    it('shows the route fully traveled once delivered', async () => {
      const delivered = { ...inTransit, status: 'DELIVERED' as const };
      serveTracking(delivered);
      renderWithQueryClient(<PublicTrackingDetails initialData={delivered} />);

      expect(mapProps(await screen.findByTestId('delivery-map'))).toMatchObject(
        {
          stage: 'DONE',
          position: null,
          caption: 'Delivered in São Paulo',
        },
      );
    });

    it('shows no map before the shipment is on the road', () => {
      const accepted = { ...inTransit, status: 'ACCEPTED' as const };
      renderWithQueryClient(<PublicTrackingDetails initialData={accepted} />);

      expect(screen.queryByTestId('delivery-map')).toBeNull();
    });

    it('moves the vehicle on a public tracking:position ping', async () => {
      serveTracking(inTransit);
      renderWithQueryClient(<PublicTrackingDetails initialData={inTransit} />);
      await screen.findByTestId('delivery-map');

      const ping = {
        lat: -23.45,
        lng: -46.75,
        heading: 140,
        recordedAt: '2026-01-02T00:00:02.000Z',
      };
      act(() =>
        socket.trigger('tracking:position', {
          ...ping,
          trackingCode: 'TMS-AAA111',
        }),
      );

      await waitFor(() =>
        expect(mapProps(screen.getByTestId('delivery-map')).position).toEqual(
          ping,
        ),
      );
    });
  });
});
