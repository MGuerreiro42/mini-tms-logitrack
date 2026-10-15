import { QueryClient } from '@tanstack/react-query';
import { hardNavigate } from '@/lib/hard-navigate';
import {
  clearSession,
  SESSION_CHANNEL,
  type Session,
  setSession,
} from '@/lib/session';
import { renderWithQueryClient } from '@/test/render';
import { SessionSync } from './session-sync';

vi.mock('@/lib/hard-navigate', () => ({ hardNavigate: vi.fn() }));

const session: Session = {
  token: 'first-token',
  role: 'SELLER',
  userId: 'u',
  email: 'e',
};

function restoreFromBackForwardCache(persisted = true) {
  window.dispatchEvent(
    Object.assign(new Event('pageshow'), { persisted }) as PageTransitionEvent,
  );
}

describe('SessionSync', () => {
  let otherTab: BroadcastChannel;

  beforeEach(() => {
    setSession(session);
    vi.mocked(hardNavigate).mockClear();
    otherTab = new BroadcastChannel(SESSION_CHANNEL);
  });

  afterEach(() => {
    otherTab.close();
    clearSession();
  });

  it('drops cached data and re-enters the app when another tab changes the session', async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(['shipments', 'list'], { data: [] });
    renderWithQueryClient(<SessionSync />, queryClient);

    otherTab.postMessage(null);

    await vi.waitFor(() => expect(hardNavigate).toHaveBeenCalledWith('/'));
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
  });

  it('leaves a shell that was restored from the cache after logout', () => {
    clearSession();

    renderWithQueryClient(<SessionSync />);

    expect(hardNavigate).toHaveBeenCalledWith('/');
  });

  it.each([
    ['signed out', () => clearSession()],
    ['signed in as someone else', () => setSession({ ...session, token: 'x' })],
  ])('leaves a page restored by Back after the user %s', (_case, change) => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(['shipments', 'list'], { data: [] });
    renderWithQueryClient(<SessionSync />, queryClient);
    change();

    restoreFromBackForwardCache();

    expect(hardNavigate).toHaveBeenCalledWith('/');
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
  });

  it('keeps a restored page whose session is unchanged', () => {
    renderWithQueryClient(<SessionSync />);

    restoreFromBackForwardCache();

    expect(hardNavigate).not.toHaveBeenCalled();
  });

  it('ignores an ordinary page load', () => {
    renderWithQueryClient(<SessionSync />);
    clearSession();

    restoreFromBackForwardCache(false);

    expect(hardNavigate).not.toHaveBeenCalled();
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
    clearSession();
    restoreFromBackForwardCache();

    expect(hardNavigate).not.toHaveBeenCalled();
  });
});
