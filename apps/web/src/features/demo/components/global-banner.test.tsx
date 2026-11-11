import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { setSession } from '@/lib/session';
import { getSocket } from '@/services/websocket-client';
import { makeFakeSocket } from '@/test/fake-socket';
import { server } from '@/test/msw/server';
import { renderWithQueryClient } from '@/test/render';
import type { GlobalRole } from '@/types/auth';
import type { DemoStatus } from '../types';
import { GlobalBanner } from './global-banner';

vi.mock('@/lib/demo', () => ({ DEMO_LOGIN_ENABLED: true }));
vi.mock('@/services/websocket-client', async (importOriginal) => ({
  ...(await importOriginal()),
  getSocket: vi.fn(),
  retainSocket: vi.fn(() => () => {}),
}));

const API_URL = 'http://localhost:3333';
const CHAOS = {
  scenario: 'failed-deliveries',
  label: 'Storm: failed deliveries',
  description: 'About half of the deliveries fail, then return to sender.',
};

describe('GlobalBanner', () => {
  let socket: ReturnType<typeof makeFakeSocket>;
  let endCalls: number;

  const answer = (status: DemoStatus | null) =>
    server.use(
      http.get(`${API_URL}/demo/status`, () =>
        status
          ? HttpResponse.json(status)
          : new HttpResponse(null, { status: 404 }),
      ),
    );
  const signIn = (role: GlobalRole, email = 'someone@example.com') =>
    setSession({ token: 't', role, userId: 'u', email });
  const running = (msLeft = 125_000) => ({
    chaos: { ...CHAOS, endsAt: new Date(Date.now() + msLeft).toISOString() },
    nextResetAt: null,
  });

  beforeEach(() => {
    endCalls = 0;
    socket = makeFakeSocket();
    vi.mocked(getSocket).mockReturnValue(socket as never);
    server.use(
      http.delete(`${API_URL}/admin/demo/chaos`, () => {
        endCalls++;
        return new HttpResponse(null, { status: 204 });
      }),
    );
  });

  it('shows the running scenario with its countdown, and lets an admin end it', async () => {
    signIn('ADMIN');
    answer(running());
    renderWithQueryClient(<GlobalBanner />);

    expect(
      await screen.findByText('Chaos Mode: Storm: failed deliveries.'),
    ).toBeInTheDocument();
    expect(screen.getByText(/^2:0\d left$/)).toHaveAttribute('aria-hidden');
    expect(screen.getByRole('status')).toHaveTextContent(
      /^Chaos Mode started: Storm: failed deliveries, ends at \d\d:\d\d$/,
    );

    await userEvent.click(screen.getByRole('button', { name: 'End now' }));

    expect(endCalls).toBe(1);
  });

  it('hides when the run ends and announces only that', async () => {
    signIn('SELLER');
    answer(running());
    renderWithQueryClient(<GlobalBanner />);
    await screen.findByText('Chaos Mode: Storm: failed deliveries.');
    expect(screen.queryByRole('button', { name: 'End now' })).toBeNull();

    act(() => socket.trigger('demo:chaos', null));

    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('Chaos Mode ended'),
    );
    expect(screen.queryByText(/Chaos Mode:/)).toBeNull();
  });

  it('appears when a run starts over the socket', async () => {
    signIn('CARRIER_OPERATOR');
    answer({ chaos: null, nextResetAt: null });
    renderWithQueryClient(<GlobalBanner />);
    const status = await screen.findByRole('status');
    expect(status).toBeEmptyDOMElement();

    act(() => socket.trigger('demo:chaos', running().chaos));

    expect(
      await screen.findByText('Chaos Mode: Storm: failed deliveries.'),
    ).toBeInTheDocument();
  });

  it('tells a demo account it shares the demo until dismissed for the session', async () => {
    signIn('SELLER', 'seller@demo.minitms.dev');
    answer({ chaos: null, nextResetAt: '2026-01-02T07:00:00.000Z' });
    const { unmount } = renderWithQueryClient(<GlobalBanner />);

    expect(
      await screen.findByText(
        /^You're using the shared public demo\. Data resets daily at \d\d:\d\d\.$/,
      ),
    ).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: 'Dismiss the demo notice' }),
    );
    unmount();
    renderWithQueryClient(<GlobalBanner />);

    await screen.findByRole('status');
    expect(screen.queryByText(/shared public demo/)).toBeNull();
  });

  it('shows no demo notice to a visitor-created account', async () => {
    signIn('SELLER');
    answer({ chaos: null, nextResetAt: null });
    renderWithQueryClient(<GlobalBanner />);

    await screen.findByRole('status');
    expect(screen.queryByText(/shared public demo/)).toBeNull();
  });

  it('renders nothing when the API has no simulator', async () => {
    signIn('ADMIN');
    answer(null);
    const { container } = renderWithQueryClient(<GlobalBanner />);

    await act(() => new Promise((resolve) => setTimeout(resolve, 50)));
    expect(container).toBeEmptyDOMElement();
  });
});
