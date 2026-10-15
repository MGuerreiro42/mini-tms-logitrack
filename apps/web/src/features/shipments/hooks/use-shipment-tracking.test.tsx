import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useSession } from '@/hooks/use-session';
import { getSocket } from '@/services/websocket-client';
import { makeFakeSocket } from '@/test/fake-socket';
import { useShipmentTracking } from './use-shipment-tracking';

vi.mock('@/hooks/use-session', () => ({ useSession: vi.fn() }));
vi.mock('@/services/websocket-client', async (importOriginal) => ({
  ...(await importOriginal()),
  getSocket: vi.fn(),
}));

const session = {
  token: 't',
  role: 'SELLER' as const,
  userId: 'u',
  email: 'e',
};

function makeWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe('useShipmentTracking', () => {
  beforeEach(() => {
    vi.mocked(useSession).mockReturnValue(session);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does nothing when there is no session', () => {
    vi.mocked(useSession).mockReturnValue(null);
    const queryClient = new QueryClient();

    renderHook(() => useShipmentTracking({ shipmentId: 'shipment-1' }), {
      wrapper: makeWrapper(queryClient),
    });

    expect(getSocket).not.toHaveBeenCalled();
  });

  it('connects and subscribes to the shipment room once connected', () => {
    const socket = makeFakeSocket();
    vi.mocked(getSocket).mockReturnValue(socket as never);
    const queryClient = new QueryClient();

    renderHook(() => useShipmentTracking({ shipmentId: 'shipment-1' }), {
      wrapper: makeWrapper(queryClient),
    });

    expect(socket.connect).toHaveBeenCalled();
    expect(socket.emit).not.toHaveBeenCalled();

    socket.trigger('connect');

    expect(socket.emit).toHaveBeenCalledWith(
      'subscribe:shipment',
      'shipment-1',
      expect.any(Function),
    );
  });

  it('subscribes immediately if the socket is already connected at mount', () => {
    const socket = makeFakeSocket();
    socket.connected = true;
    vi.mocked(getSocket).mockReturnValue(socket as never);
    const queryClient = new QueryClient();

    renderHook(() => useShipmentTracking({ subscribeToQueue: true }), {
      wrapper: makeWrapper(queryClient),
    });

    expect(socket.emit).toHaveBeenCalledWith(
      'subscribe:queue',
      expect.any(Function),
    );
  });

  it('subscribes to the queue room, not a shipment room, when subscribeToQueue is set', () => {
    const socket = makeFakeSocket();
    vi.mocked(getSocket).mockReturnValue(socket as never);
    const queryClient = new QueryClient();

    renderHook(() => useShipmentTracking({ subscribeToQueue: true }), {
      wrapper: makeWrapper(queryClient),
    });
    socket.trigger('connect');

    expect(socket.emit).toHaveBeenCalledWith(
      'subscribe:queue',
      expect.any(Function),
    );
    expect(socket.emit).not.toHaveBeenCalledWith(
      'subscribe:shipment',
      expect.anything(),
    );
  });

  it('invalidates every shipment query on shipment:updated', () => {
    const socket = makeFakeSocket();
    vi.mocked(getSocket).mockReturnValue(socket as never);
    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    renderHook(() => useShipmentTracking({ shipmentId: 'shipment-1' }), {
      wrapper: makeWrapper(queryClient),
    });
    socket.trigger('shipment:updated', { shipmentId: 'shipment-1' });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['shipments'] });
  });

  it('collapses a burst of updates into one immediate and one trailing refetch', () => {
    vi.useFakeTimers();
    const socket = makeFakeSocket();
    vi.mocked(getSocket).mockReturnValue(socket as never);
    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    renderHook(() => useShipmentTracking({ subscribeToMonitoring: true }), {
      wrapper: makeWrapper(queryClient),
    });

    for (let i = 0; i < 20; i++) socket.trigger('shipment:updated', {});
    expect(invalidateSpy).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(300);
    expect(invalidateSpy).toHaveBeenCalledTimes(2);
  });

  it('drops the trailing refetch on unmount', () => {
    vi.useFakeTimers();
    const socket = makeFakeSocket();
    vi.mocked(getSocket).mockReturnValue(socket as never);
    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { unmount } = renderHook(
      () => useShipmentTracking({ subscribeToMonitoring: true }),
      { wrapper: makeWrapper(queryClient) },
    );
    socket.trigger('shipment:updated', {});
    socket.trigger('shipment:updated', {});

    unmount();
    vi.advanceTimersByTime(300);

    expect(invalidateSpy).toHaveBeenCalledTimes(1);
  });

  it('subscribes to the monitoring room when subscribeToMonitoring is set', () => {
    const socket = makeFakeSocket();
    vi.mocked(getSocket).mockReturnValue(socket as never);
    const queryClient = new QueryClient();

    renderHook(() => useShipmentTracking({ subscribeToMonitoring: true }), {
      wrapper: makeWrapper(queryClient),
    });
    socket.trigger('connect');

    expect(socket.emit).toHaveBeenCalledWith(
      'subscribe:monitoring',
      expect.any(Function),
    );
  });

  it('invalidates after every (re)subscription, not just on a received message', async () => {
    const socket = makeFakeSocket();
    vi.mocked(getSocket).mockReturnValue(socket as never);
    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    renderHook(() => useShipmentTracking({ shipmentId: 'shipment-1' }), {
      wrapper: makeWrapper(queryClient),
    });

    socket.trigger('connect');
    await act(async () => socket.ackAll({ ok: true }));
    expect(invalidateSpy).toHaveBeenCalledTimes(1);
    socket.emit.mockClear();

    socket.trigger('connect');
    await act(async () => socket.ackAll({ ok: true }));
    await waitFor(() => expect(invalidateSpy).toHaveBeenCalledTimes(2));
  });

  it('does not reconnect when useSession returns a new object with the same token ', () => {
    const socket = makeFakeSocket();
    vi.mocked(getSocket).mockReturnValue(socket as never);
    const queryClient = new QueryClient();

    const { rerender } = renderHook(
      () => useShipmentTracking({ shipmentId: 'shipment-1' }),
      { wrapper: makeWrapper(queryClient) },
    );
    socket.trigger('connect');
    socket.connect.mockClear();
    socket.disconnect.mockClear();
    socket.emit.mockClear();

    vi.mocked(useSession).mockReturnValue({ ...session });
    rerender();

    expect(socket.disconnect).not.toHaveBeenCalled();
    expect(socket.connect).not.toHaveBeenCalled();
    expect(socket.emit).not.toHaveBeenCalled();
  });

  it('unsubscribes and disconnects on unmount', () => {
    const socket = makeFakeSocket();
    vi.mocked(getSocket).mockReturnValue(socket as never);
    const queryClient = new QueryClient();

    const { unmount } = renderHook(
      () => useShipmentTracking({ shipmentId: 'shipment-1' }),
      { wrapper: makeWrapper(queryClient) },
    );
    unmount();

    expect(socket.off).toHaveBeenCalledWith(
      'shipment:updated',
      expect.any(Function),
    );
    expect(socket.off).toHaveBeenCalledWith('connect', expect.any(Function));
    expect(socket.disconnect).toHaveBeenCalled();
  });
});
