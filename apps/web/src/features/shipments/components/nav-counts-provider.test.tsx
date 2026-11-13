import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { useNavCounts } from '@/components/common/nav-counts';
import { useSession } from '@/hooks/use-session';
import { getSocket } from '@/services/websocket-client';
import { makeFakeSocket } from '@/test/fake-socket';
import { server } from '@/test/msw/server';
import { shipmentKeys } from '../api/keys';
import { CarrierNavCounts } from './nav-counts-provider';

vi.mock('@/hooks/use-session', () => ({ useSession: vi.fn() }));
vi.mock('@/services/websocket-client', async (importOriginal) => ({
  ...(await importOriginal()),
  getSocket: vi.fn(),
}));

function Probe() {
  const { counts, status } = useNavCounts();
  return (
    <p>
      {status} {counts?.unclaimed ?? '-'}
    </p>
  );
}

describe('CarrierNavCounts', () => {
  afterEach(() => vi.useRealTimers());

  it('refreshes only its counts, at most once per 2 s, on queue events', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.mocked(useSession).mockReturnValue({
      token: 't',
      role: 'CARRIER_OPERATOR',
      userId: 'u',
      email: 'e',
    });
    const socket = makeFakeSocket();
    socket.connected = true;
    vi.mocked(getSocket).mockReturnValue(socket as never);
    let unclaimed = 7;
    server.use(
      http.get('*/shipments/queue/view-counts', () =>
        HttpResponse.json({ unclaimed: unclaimed-- }),
      ),
    );
    const queryClient = new QueryClient();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');

    render(
      <QueryClientProvider client={queryClient}>
        <CarrierNavCounts>
          <Probe />
        </CarrierNavCounts>
      </QueryClientProvider>,
    );
    expect(socket.emit).toHaveBeenCalledWith(
      'subscribe:queue',
      expect.any(Function),
    );
    act(() => socket.ackAll({ ok: true }));
    expect(await screen.findByText('live 7')).toBeInTheDocument();

    // The join's catch-up refresh opened a throttle window; let it close.
    act(() => vi.advanceTimersByTime(2000));
    invalidate.mockClear();
    act(() => {
      socket.trigger('shipment:updated', { id: 'a' });
      socket.trigger('shipment:updated', { id: 'b' });
      socket.trigger('shipment:updated', { id: 'c' });
    });
    expect(invalidate).toHaveBeenCalledTimes(1);
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: shipmentKeys.queueViewCounts(),
      exact: true,
    });
    act(() => vi.advanceTimersByTime(2000));
    expect(invalidate).toHaveBeenCalledTimes(2);
    expect(invalidate).not.toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: shipmentKeys.all }),
    );
  });
});
