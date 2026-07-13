import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { useRouter } from 'next/navigation';
import { server } from '@/test/msw/server';
import { renderWithQueryClient } from '@/test/render';
import { CarrierSignupForm } from './carrier-signup-form';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

const API_URL = 'http://localhost:3333';

describe('CarrierSignupForm', () => {
  const push = vi.fn();

  beforeEach(() => {
    push.mockReset();
    vi.mocked(useRouter).mockReturnValue({ push } as unknown as ReturnType<
      typeof useRouter
    >);
  });

  async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
    await user.type(
      screen.getByLabelText('Carrier company name'),
      'Fast Freight',
    );
    await user.type(screen.getByLabelText('Tax ID (CNPJ)'), '12345678000199');
    await user.type(
      screen.getByLabelText('Manager email'),
      'manager@example.com',
    );
    await user.type(screen.getByLabelText('Password'), 'password123');
  }

  it('shows validation errors and never calls the API for invalid input', async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<CarrierSignupForm />);

    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(await screen.findAllByText('Required')).toHaveLength(2);
    expect(screen.getByText('Enter a valid email')).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it('signs up and redirects to /status (no session set on signup)', async () => {
    server.use(
      http.post(`${API_URL}/carriers`, () =>
        HttpResponse.json(
          { id: 'carrier-1', status: 'PENDING' },
          { status: 201 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderWithQueryClient(<CarrierSignupForm />);

    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => expect(push).toHaveBeenCalledWith('/status'));
  });

  it('surfaces the backend conflict message verbatim', async () => {
    server.use(
      http.post(`${API_URL}/carriers`, () =>
        HttpResponse.json(
          { statusCode: 409, message: 'Email or document already registered' },
          { status: 409 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderWithQueryClient(<CarrierSignupForm />);

    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(
      await screen.findByText('Email or document already registered'),
    ).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });
});
