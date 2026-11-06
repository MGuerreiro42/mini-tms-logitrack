import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import type { Socket } from 'socket.io-client';
import { makeFakeSocket } from '@/test/fake-socket';
import type { LastPosition } from '../types';
import { usePositionSubscription } from './use-position-subscription';

interface Ping extends LastPosition {
  shipmentId: string;
}

const KEY = ['shipments', 'detail', 'shipment-1'];
const current: LastPosition = {
  lat: -23.5,
  lng: -46.6,
  heading: 90,
  recordedAt: '2026-01-01T00:00:02.000Z',
};

function ping(overrides: Partial<Ping> = {}): Ping {
  return {
    shipmentId: 'shipment-1',
    lat: -23.51,
    lng: -46.61,
    heading: 100,
    recordedAt: '2026-01-01T00:00:04.000Z',
    ...overrides,
  };
}

function setup() {
  const socket = makeFakeSocket();
  const queryClient = new QueryClient();
  queryClient.setQueryData(KEY, { id: 'shipment-1', lastPosition: current });
  const hook = renderHook(
    () =>
      usePositionSubscription<Ping>({
        getSocket: () => socket as unknown as Socket,
        connectionKey: 'token',
        room: { event: 'subscribe:shipment', args: ['shipment-1'] },
        accepts: (event) => event.shipmentId === 'shipment-1',
        queryKey: KEY,
      }),
    {
      wrapper: ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      ),
    },
  );
  const cached = () =>
    queryClient.getQueryData<{ id: string; lastPosition: LastPosition }>(KEY);
  return { socket, cached, ...hook };
}

describe('usePositionSubscription', () => {
  it('subscribes to the room on connect', () => {
    const { socket } = setup();

    act(() => socket.trigger('connect'));

    expect(socket.emit).toHaveBeenCalledWith(
      'subscribe:shipment',
      'shipment-1',
      expect.any(Function),
    );
  });

  it('writes a newer ping into the cached detail, keeping the rest', () => {
    const { socket, cached } = setup();

    act(() => socket.trigger('tracking:position', ping()));

    expect(cached()).toEqual({
      id: 'shipment-1',
      lastPosition: {
        lat: -23.51,
        lng: -46.61,
        heading: 100,
        recordedAt: '2026-01-01T00:00:04.000Z',
      },
    });
  });

  it('ignores a ping older than the cached position', () => {
    const { socket, cached } = setup();

    act(() =>
      socket.trigger(
        'tracking:position',
        ping({ recordedAt: '2026-01-01T00:00:01.000Z' }),
      ),
    );

    expect(cached()?.lastPosition).toEqual(current);
  });

  it("ignores another shipment's ping", () => {
    const { socket, cached } = setup();

    act(() =>
      socket.trigger('tracking:position', ping({ shipmentId: 'shipment-2' })),
    );

    expect(cached()?.lastPosition).toEqual(current);
  });

  it('treats the catch-up notification without a payload as a no-op', async () => {
    const { socket, cached } = setup();

    act(() => socket.trigger('connect'));
    await act(async () => socket.ackAll({ ok: true }));

    expect(cached()?.lastPosition).toEqual(current);
  });

  it('unsubscribes on unmount', async () => {
    const { socket, unmount } = setup();
    socket.connected = true;
    act(() => socket.trigger('connect'));

    unmount();

    expect(socket.off).toHaveBeenCalledWith(
      'tracking:position',
      expect.any(Function),
    );
    expect(socket.emit).toHaveBeenCalledWith(
      'unsubscribe:shipment',
      'shipment-1',
    );
  });
});
