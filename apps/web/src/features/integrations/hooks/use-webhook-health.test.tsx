import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import type { ReactNode } from 'react';
import { useSession } from '@/hooks/use-session';
import { getSocket } from '@/services/websocket-client';
import { makeFakeSocket } from '@/test/fake-socket';
import { server } from '@/test/msw/server';
import { integrationKeys } from '../api/keys';
import { useWebhookHealth } from './use-webhook-health';

vi.mock('@/hooks/use-session', () => ({ useSession: vi.fn() }));
vi.mock('@/services/websocket-client', async (importOriginal) => ({
  ...(await importOriginal()),
  getSocket: vi.fn(),
}));

const HEALTH = {
  state: 'down',
  n: 6,
  successRate: 16.7,
  p95Ms: 1200,
  lastSuccessAt: '2026-11-13T13:50:00.000Z',
  failingSince: '2026-11-13T14:02:00.000Z',
};

function setup() {
  const socket = makeFakeSocket();
  vi.mocked(getSocket).mockReturnValue(socket as never);
  const queryClient = new QueryClient();
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
  const { result } = renderHook(() => useWebhookHealth(), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  });
  return { socket, invalidate, result };
}

describe('useWebhookHealth', () => {
  beforeEach(() => {
    vi.mocked(useSession).mockReturnValue({
      token: 't',
      role: 'SELLER',
      userId: 'u',
      email: 'e',
    });
    server.use(
      http.get('http://localhost:3333/webhooks/health', () =>
        HttpResponse.json(HEALTH),
      ),
    );
  });

  it('reads the endpoint health', async () => {
    const { result } = setup();

    await waitFor(() => expect(result.current.data).toEqual(HEALTH));
  });

  it('refreshes from the seller room on a webhook delivery', () => {
    const { socket, invalidate } = setup();
    socket.trigger('connect');

    expect(socket.emit).toHaveBeenCalledWith(
      'subscribe:seller',
      expect.any(Function),
    );

    socket.trigger('webhook:delivery', { id: 'delivery-1' });

    expect(invalidate).toHaveBeenCalledWith({
      queryKey: integrationKeys.health(),
    });
  });
});
