import { act, screen } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { getPublicSocket } from '@/services/websocket-client';
import { useRealtimeStore } from '@/store/realtime-store';
import { makeFakeSocket } from '@/test/fake-socket';
import { server } from '@/test/msw/server';
import { renderWithQueryClient } from '@/test/render';
import type { PublicTracking } from '../types';
import { PublicTrackingDetails } from './public-tracking-details';

vi.mock('@/services/websocket-client', () => ({ getPublicSocket: vi.fn() }));

const API_URL = 'http://localhost:3333';

const tracking: PublicTracking = {
  trackingCode: 'TMS-AAA111',
  status: 'ACCEPTED',
  addressCity: 'São Paulo',
  addressState: 'SP',
  modalityName: 'Standard',
  events: [{ status: 'ACCEPTED', createdAt: '2026-01-01T00:00:00.000Z' }],
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

  it('subscribes to the tracking room and goes live once the server acks', () => {
    renderWithQueryClient(<PublicTrackingDetails initialData={tracking} />);

    expect(screen.getByRole('status')).toHaveTextContent('Reconnecting');
    act(() => socket.trigger('connect'));

    const [event, code, ack] = socket.emit.mock.calls[0];
    expect(event).toBe('subscribe:tracking');
    expect(code).toBe('TMS-AAA111');
    act(() => (ack as (res: { ok: boolean }) => void)({ ok: true }));

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

    expect((await screen.findAllByText('Collected')).length).toBeGreaterThan(0);
  });

  it('disconnects and resets the live flag on unmount', () => {
    const { unmount } = renderWithQueryClient(
      <PublicTrackingDetails initialData={tracking} />,
    );
    act(() => useRealtimeStore.getState().setConnected(true));

    unmount();

    expect(socket.disconnect).toHaveBeenCalled();
    expect(useRealtimeStore.getState().connected).toBe(false);
  });
});
