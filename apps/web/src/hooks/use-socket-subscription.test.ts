import { act, renderHook } from '@testing-library/react';
import type { Socket } from 'socket.io-client';
import { useRealtimeStore } from '@/store/realtime-store';
import { makeFakeSocket } from '@/test/fake-socket';
import {
  type SocketSubscription,
  useSocketSubscription,
} from './use-socket-subscription';

const rooms: SocketSubscription[] = [
  { event: 'subscribe:shipment', args: ['shipment-1'] },
  { event: 'subscribe:queue' },
];

function setup(connectionKey: string | undefined) {
  const socket = makeFakeSocket();
  const onUpdate = vi.fn();
  const hook = renderHook(() =>
    useSocketSubscription({
      getSocket: () => socket as unknown as Socket,
      connectionKey,
      subscriptions: rooms,
      updateEvent: 'shipment:updated',
      onUpdate,
    }),
  );
  return { socket, onUpdate, ...hook };
}

async function flush() {
  await act(async () => {});
}

describe('useSocketSubscription', () => {
  beforeEach(() => useRealtimeStore.getState().setConnected(false));

  it('does not connect without a connection key', () => {
    const { socket } = setup(undefined);
    expect(socket.connect).not.toHaveBeenCalled();
  });

  it('subscribes to every room with an ack timeout on connect', () => {
    const { socket } = setup('token');
    act(() => socket.trigger('connect'));

    expect(socket.timeout).toHaveBeenCalled();
    expect(socket.emit).toHaveBeenCalledWith(
      'subscribe:shipment',
      'shipment-1',
      expect.any(Function),
    );
    expect(socket.emit).toHaveBeenCalledWith(
      'subscribe:queue',
      expect.any(Function),
    );
  });

  it('goes live only once every subscription acks ok', async () => {
    const { socket } = setup('token');
    act(() => socket.trigger('connect'));
    expect(useRealtimeStore.getState().connected).toBe(false);

    socket.ackAll({ ok: true });
    await flush();

    expect(useRealtimeStore.getState().connected).toBe(true);
  });

  it('stays not live when any ack is false or times out', async () => {
    const { socket } = setup('token');
    act(() => socket.trigger('connect'));

    const [, , shipmentAck] = socket.emit.mock.calls[0];
    const [, queueAck] = socket.emit.mock.calls[1];
    shipmentAck(null, { ok: true });
    queueAck(new Error('operation has timed out'));
    await flush();

    expect(useRealtimeStore.getState().connected).toBe(false);
  });

  it('ignores an ack that arrives after unmount', async () => {
    const { socket, unmount } = setup('token');
    act(() => socket.trigger('connect'));
    unmount();

    socket.ackAll({ ok: true });
    await flush();

    expect(useRealtimeStore.getState().connected).toBe(false);
    expect(socket.disconnect).toHaveBeenCalled();
  });

  it('resyncs on every (re)connect and forwards update payloads', () => {
    const { socket, onUpdate } = setup('token');

    act(() => socket.trigger('connect'));
    expect(onUpdate).toHaveBeenCalledWith(undefined);

    socket.trigger('shipment:updated', { shipmentId: 'shipment-1' });
    expect(onUpdate).toHaveBeenCalledWith({ shipmentId: 'shipment-1' });
  });

  it('drops the live flag on disconnect', async () => {
    const { socket } = setup('token');
    act(() => socket.trigger('connect'));
    socket.ackAll({ ok: true });
    await flush();

    act(() => socket.trigger('disconnect'));

    expect(useRealtimeStore.getState().connected).toBe(false);
  });
});
