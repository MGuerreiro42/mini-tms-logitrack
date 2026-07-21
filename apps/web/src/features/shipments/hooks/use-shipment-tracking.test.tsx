import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useSession } from '@/hooks/use-session';
import { getSocket } from '@/services/websocket-client';
import { makeFakeSocket } from '@/test/fake-socket';
import { useShipmentTracking } from './use-shipment-tracking';

vi.mock('@/hooks/use-session', () => ({ useSession: vi.fn() }));
vi.mock('@/services/websocket-client', () => ({ getSocket: vi.fn() }));

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

    expect(socket.emit).toHaveBeenCalledWith('subscribe:queue');
  });

  it('subscribes to the queue room, not a shipment room, when subscribeToQueue is set', () => {
    const socket = makeFakeSocket();
    vi.mocked(getSocket).mockReturnValue(socket as never);
    const queryClient = new QueryClient();

    renderHook(() => useShipmentTracking({ subscribeToQueue: true }), {
      wrapper: makeWrapper(queryClient),
    });
    socket.trigger('connect');

    expect(socket.emit).toHaveBeenCalledWith('subscribe:queue');
    expect(socket.emit).not.toHaveBeenCalledWith(
      'subscribe:shipment',
      expect.anything(),
    );
  });

  it('invalidates shipment detail, queue detail, queue list, and admin list on shipment:updated', () => {
    const socket = makeFakeSocket();
    vi.mocked(getSocket).mockReturnValue(socket as never);
    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    renderHook(() => useShipmentTracking({ shipmentId: 'shipment-1' }), {
      wrapper: makeWrapper(queryClient),
    });
    socket.trigger('shipment:updated', { shipmentId: 'shipment-1' });

    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['shipments', 'detail', 'shipment-1'],
      }),
    );
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['shipments', 'queue', 'detail', 'shipment-1'],
      }),
    );
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['shipments', 'queue', 'list'] }),
    );
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['shipments', 'admin', 'list'] }),
    );
  });

  it('subscribes to the monitoring room when subscribeToMonitoring is set', () => {
    const socket = makeFakeSocket();
    vi.mocked(getSocket).mockReturnValue(socket as never);
    const queryClient = new QueryClient();

    renderHook(() => useShipmentTracking({ subscribeToMonitoring: true }), {
      wrapper: makeWrapper(queryClient),
    });
    socket.trigger('connect');

    expect(socket.emit).toHaveBeenCalledWith('subscribe:monitoring');
  });

  it('invalidates on every (re)connect, not just on a received message (regression: a message missed during a disconnect must not leave the view stuck on stale data)', () => {
    const socket = makeFakeSocket();
    vi.mocked(getSocket).mockReturnValue(socket as never);
    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    renderHook(() => useShipmentTracking({ shipmentId: 'shipment-1' }), {
      wrapper: makeWrapper(queryClient),
    });

    // First connect — the initial catch-up.
    socket.trigger('connect');
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['shipments', 'detail', 'shipment-1'],
      }),
    );
    invalidateSpy.mockClear();

    // Simulate a drop-and-reconnect (e.g. a network blip) during which a
    // shipment:updated message was missed entirely — no message ever fires
    // here, only a second 'connect'.
    socket.trigger('connect');

    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['shipments', 'detail', 'shipment-1'],
      }),
    );
  });

  it('does not reconnect when useSession returns a new object with the same token (regression: useSession re-parses the cookie on every call)', () => {
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

    // A fresh object, same token value — exactly what useSession() returns
    // on every real render (getSessionFromDocument() re-parses the cookie).
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
