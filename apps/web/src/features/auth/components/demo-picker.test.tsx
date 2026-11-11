import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, HttpResponse, http } from 'msw';
import { useRouter } from 'next/navigation';
import { server } from '@/test/msw/server';
import { renderWithQueryClient } from '@/test/render';
import { DemoPicker } from './demo-picker';
import { LoginForm } from './login-form';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

const API_URL = 'http://localhost:3333';
const signedIn = (email: string, role: string) =>
  HttpResponse.json({
    accessToken: 'signed.jwt.token',
    user: { id: 'user-2', email, role },
  });

describe('DemoPicker', () => {
  const push = vi.fn();

  beforeEach(() => {
    push.mockReset();
    vi.mocked(useRouter).mockReturnValue({ push } as unknown as ReturnType<
      typeof useRouter
    >);
    document.cookie = 'tms_session=; path=/; max-age=0';
  });

  it('offers four roles, each named by its label and described by what it does', () => {
    renderWithQueryClient(<DemoPicker />);

    const cards = ['Seller', 'Carrier manager', 'Operator', 'Admin'].map(
      (name) => screen.getByRole('button', { name }),
    );
    expect(cards[3]).toHaveAccessibleDescription(
      'Demo admin Approvals, platform pulse and Chaos Mode on demo data.',
    );
  });

  it('signs the admin in with the keyboard alone', async () => {
    let body: unknown;
    server.use(
      http.post(`${API_URL}/auth/login`, async ({ request }) => {
        body = await request.json();
        return signedIn('admin@demo.minitms.dev', 'ADMIN');
      }),
    );
    const user = userEvent.setup();
    renderWithQueryClient(<DemoPicker />);

    await user.tab();
    await user.tab();
    await user.tab();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Admin' })).toHaveFocus();
    await user.keyboard('{Enter}');

    await waitFor(() => expect(push).toHaveBeenCalledWith('/admin'));
    expect(body).toEqual({
      email: 'admin@demo.minitms.dev',
      password: 'demo12345',
    });
  });

  it.each([
    ['/carrier/queue/abc?tab=events', '/carrier/queue/abc?tab=events'],
    ['https://evil.example', '/carrier/queue'],
    ['/admin', '/carrier/queue'],
  ])('lands on next=%s when the role may open it', async (next, target) => {
    server.use(
      http.post(`${API_URL}/auth/login`, () =>
        signedIn('carrier@demo.minitms.dev', 'CARRIER_MANAGER'),
      ),
    );
    renderWithQueryClient(<DemoPicker next={next} />);

    await userEvent.click(
      screen.getByRole('button', { name: 'Carrier manager' }),
    );

    await waitFor(() => expect(push).toHaveBeenCalledWith(target));
  });

  it('holds every card and the form while one signs in, then shows a failure in the form', async () => {
    server.use(
      http.post(`${API_URL}/auth/login`, async () => {
        await delay(50);
        return HttpResponse.json(
          { message: 'Invalid credentials' },
          { status: 401 },
        );
      }),
    );
    renderWithQueryClient(
      <>
        <DemoPicker />
        <LoginForm />
      </>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Seller' }));

    const seller = screen.getByRole('button', { name: 'Seller' });
    expect(seller).toHaveAttribute('aria-busy', 'true');
    expect(seller).toHaveTextContent('Signing in…');
    expect(screen.getByRole('button', { name: 'Operator' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeDisabled();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Invalid credentials',
    );
  });
});
