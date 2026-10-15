import { act, renderHook } from '@testing-library/react';
import { StrictMode } from 'react';
import type { Socket } from 'socket.io-client';
import { makeFakeSocket } from '@/test/fake-socket';
import {
  type SocketSubscription,
  useSocketSubscription,
} from './use-socket-subscription';

const rooms: SocketSubscription[] = [
  { event: 'subscribe:shipment', args: ['shipment-1'] },
  { event: 'subscribe:queue' },
];

function setup(
  connectionKey: string | undefined,
  { socket = makeFakeSocket(), strict = false } = {},
) {
  const onUpdate = vi.fn();
  const hook = renderHook(
    () =>
      useSocketSubscription({
        getSocket: () => socket as unknown as Socket,
        connectionKey,
        subscriptions: rooms,
        updateEvent: 'shipment:updated',
        onUpdate,
      }),
    { wrapper: strict ? StrictMode : undefined },
  );
  return { socket, onUpdate, ...hook };
}

async function connectAndAck(
  socket: ReturnType<typeof makeFakeSocket>,
  ack: unknown = { ok: true },
) {
  act(() => socket.trigger('connect'));
  await act(async () => socket.ackAll(ack));
}

describe('useSocketSubscription', () => {
  it('does not connect without a connection key', () => {
    const { socket, result } = setup(undefined);

    expect(socket.connect).not.toHaveBeenCalled();
    expect(result.current).toBe('connecting');
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

  it('is connecting until every subscription acks ok, then live', async () => {
    const { socket, result } = setup('token');
    act(() => socket.trigger('connect'));
    expect(result.current).toBe('connecting');

    await act(async () => socket.ackAll({ ok: true }));

    expect(result.current).toBe('live');
  });

  it('goes offline when any ack is false or times out', async () => {
    const { socket, result } = setup('token');
    act(() => socket.trigger('connect'));

    const ackOf = (event: string) =>
      socket.emit.mock.calls.find(([name]) => name === event)?.at(-1);
    const shipmentAck = ackOf('subscribe:shipment');
    const queueAck = ackOf('subscribe:queue');
    await act(async () => {
      shipmentAck(null, { ok: true });
      queueAck(new Error('operation has timed out'));
    });

    expect(result.current).toBe('offline');
  });

  it('goes offline when the connection attempt fails', () => {
    const { socket, result } = setup('token');

    act(() => socket.trigger('connect_error', new Error('xhr poll error')));

    expect(result.current).toBe('offline');
  });

  it('goes offline on disconnect and live again after the rooms re-ack', async () => {
    const { socket, result } = setup('token');
    await connectAndAck(socket);

    act(() => socket.trigger('disconnect'));
    expect(result.current).toBe('offline');

    socket.emit.mockClear();
    await connectAndAck(socket);
    expect(result.current).toBe('live');
  });

  it('ignores a stale ack from before a reconnect', async () => {
    const { socket, result } = setup('token');
    act(() => socket.trigger('connect'));
    const staleAcks = socket.emit.mock.calls.map((call) => call.at(-1));
    act(() => socket.trigger('disconnect'));

    socket.emit.mockClear();
    await connectAndAck(socket);
    await act(async () => {
      for (const ack of staleAcks) ack(new Error('operation has timed out'));
    });

    expect(result.current).toBe('live');
  });

  it('ignores an ack that arrives after unmount', async () => {
    const { socket, result, unmount } = setup('token');
    act(() => socket.trigger('connect'));
    unmount();

    await act(async () => socket.ackAll({ ok: true }));

    expect(result.current).toBe('connecting');
    expect(socket.disconnect).toHaveBeenCalled();
  });

  it('resyncs once the rooms ack, not when the socket connects', async () => {
    const { socket, onUpdate } = setup('token');

    act(() => socket.trigger('connect'));
    expect(onUpdate).not.toHaveBeenCalled();

    await act(async () => socket.ackAll({ ok: true }));
    expect(onUpdate).toHaveBeenCalledExactlyOnceWith(undefined);
  });

  it('resyncs again after every reconnect', async () => {
    const { socket, onUpdate } = setup('token');
    await connectAndAck(socket);
    act(() => socket.trigger('disconnect'));
    socket.emit.mockClear();

    await connectAndAck(socket);

    expect(onUpdate).toHaveBeenCalledTimes(2);
  });

  it('resyncs even when a room refuses the subscription', async () => {
    const { socket, onUpdate } = setup('token');

    await connectAndAck(socket, { ok: false });

    expect(onUpdate).toHaveBeenCalledExactlyOnceWith(undefined);
  });

  it('forwards update payloads', () => {
    const { socket, onUpdate } = setup('token');

    socket.trigger('shipment:updated', { shipmentId: 'shipment-1' });

    expect(onUpdate).toHaveBeenCalledWith({ shipmentId: 'shipment-1' });
  });

  it('survives the StrictMode double mount with one connection and one set of listeners', async () => {
    const { socket, result, unmount } = setup('token', { strict: true });

    expect(socket.connect).toHaveBeenCalledTimes(2);
    expect(socket.disconnect).toHaveBeenCalledTimes(1);

    await connectAndAck(socket);
    expect(socket.emit).toHaveBeenCalledTimes(rooms.length);
    expect(result.current).toBe('live');

    unmount();
    expect(socket.disconnect).toHaveBeenCalledTimes(2);
  });

  it('shares one connection between two concurrent subscribers, each with its own status', async () => {
    const first = setup('token');
    const { socket } = first;
    socket.connected = true;
    await connectAndAck(socket);
    socket.emit.mockClear();

    const second = setup('token', { socket });

    expect(socket.connect).toHaveBeenCalledTimes(1);
    expect(socket.emit).toHaveBeenCalledTimes(rooms.length);
    expect(first.result.current).toBe('live');
    expect(second.result.current).toBe('connecting');

    await act(async () => socket.ackAll({ ok: false }));
    expect(first.result.current).toBe('live');
    expect(second.result.current).toBe('offline');

    first.unmount();
    expect(socket.disconnect).not.toHaveBeenCalled();

    socket.trigger('shipment:updated', { shipmentId: 'shipment-1' });
    expect(first.onUpdate).not.toHaveBeenCalledWith({
      shipmentId: 'shipment-1',
    });
    expect(second.onUpdate).toHaveBeenCalledWith({ shipmentId: 'shipment-1' });

    second.unmount();
    expect(socket.disconnect).toHaveBeenCalledTimes(1);
  });

  it('leaves each room once its last holder unmounts', async () => {
    const first = setup('token');
    const { socket } = first;
    socket.connected = true;
    await connectAndAck(socket);
    const second = setup('token', { socket });
    const leaves = () =>
      socket.emit.mock.calls.filter(([event]) =>
        String(event).startsWith('unsubscribe:'),
      );

    first.unmount();
    expect(leaves()).toHaveLength(0);

    second.unmount();
    expect(
      leaves()
        .map(([event]) => event)
        .sort(),
    ).toEqual(['unsubscribe:queue', 'unsubscribe:shipment']);
  });

  it('does not connect without rooms', () => {
    const socket = makeFakeSocket();
    renderHook(() =>
      useSocketSubscription({
        getSocket: () => socket as unknown as Socket,
        connectionKey: 'token',
        subscriptions: [],
        updateEvent: 'shipment:updated',
        onUpdate: vi.fn(),
      }),
    );

    expect(socket.on).not.toHaveBeenCalled();
  });
});
