import { QueryClient } from '@tanstack/react-query';
import { hardNavigate } from '@/lib/hard-navigate';
import { SESSION_CHANNEL } from '@/lib/session';
import { renderWithQueryClient } from '@/test/render';
import { SessionSync } from './session-sync';

vi.mock('@/lib/hard-navigate', () => ({ hardNavigate: vi.fn() }));

describe('SessionSync', () => {
  let otherTab: BroadcastChannel;

  beforeEach(() => {
    vi.mocked(hardNavigate).mockClear();
    otherTab = new BroadcastChannel(SESSION_CHANNEL);
  });

  afterEach(() => {
    otherTab.close();
  });

  it('drops cached data and re-enters the app when another tab changes the session', async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(['shipments', 'list'], { data: [] });
    renderWithQueryClient(<SessionSync />, queryClient);

    otherTab.postMessage(null);

    await vi.waitFor(() => expect(hardNavigate).toHaveBeenCalledWith('/'));
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
  });

  it('stops listening once unmounted', async () => {
    const { unmount } = renderWithQueryClient(<SessionSync />);
    unmount();
    const delivered = new Promise((resolve) => {
      const probe = new BroadcastChannel(SESSION_CHANNEL);
      probe.addEventListener('message', () => {
        probe.close();
        resolve(undefined);
      });
    });

    otherTab.postMessage(null);
    await delivered;

    expect(hardNavigate).not.toHaveBeenCalled();
  });
});
