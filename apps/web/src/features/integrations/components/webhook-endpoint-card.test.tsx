import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { setSession } from '@/lib/session';
import { server } from '@/test/msw/server';
import { renderWithQueryClient } from '@/test/render';
import type { WebhookEndpoint } from '../types';
import { WebhookEndpointCard } from './webhook-endpoint-card';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const API_URL = 'http://localhost:3333';
const INBOX_URL = `${API_URL}/webhook-inbox/7f0c2a4e-0000-4000-8000-000000000001`;
const SECRET = 'whsec_test-secret';

const external: WebhookEndpoint = {
  url: 'https://erp.example.com/webhooks/tms',
  events: ['SHIPMENT_CREATED', 'SHIPMENT_STATUS_CHANGED'],
  active: true,
  secret: SECRET,
  inboxUrl: INBOX_URL,
};

function serveEndpoint(endpoint: WebhookEndpoint) {
  server.use(
    http.get(`${API_URL}/webhooks/endpoint`, () => HttpResponse.json(endpoint)),
  );
}

// Radix measures a switch inside a form.
beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

describe('WebhookEndpointCard', () => {
  beforeEach(() => {
    setSession({
      token: 't',
      role: 'SELLER',
      userId: 'user-1',
      email: 'seller@example.com',
    });
    serveEndpoint(external);
  });

  it('masks the secret until revealed', async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<WebhookEndpointCard />);

    await screen.findByDisplayValue(external.url);
    expect(screen.queryByText(SECRET)).not.toBeInTheDocument();
    const masked = screen.getByText(/^whsec_/, { selector: 'code' });
    expect(masked).toHaveTextContent(/^whsec_•+\(hidden\)$/);
    expect(within(masked).getByText(/^•+$/)).toHaveAttribute(
      'aria-hidden',
      'true',
    );

    const reveal = screen.getByRole('button', { name: 'Show secret' });
    await user.click(reveal);

    expect(reveal).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText(SECRET)).toBeInTheDocument();
  });

  it('rotates the secret after confirming and shows the new one', async () => {
    const rotated = 'whsec_NewSecretAfterRotation00000000000';
    server.use(
      http.post(`${API_URL}/webhooks/endpoint/rotate-secret`, () =>
        HttpResponse.json({ ...external, secret: rotated }, { status: 201 }),
      ),
    );
    const user = userEvent.setup();
    renderWithQueryClient(<WebhookEndpointCard />);

    await user.click(await screen.findByRole('button', { name: 'Rotate' }));
    expect(screen.getByText(/signed with the new secret/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Rotate secret' }));

    expect(await screen.findByText(rotated)).toBeInTheDocument();
  });

  it('keeps an unsaved URL when the secret is rotated', async () => {
    server.use(
      http.post(`${API_URL}/webhooks/endpoint/rotate-secret`, () =>
        HttpResponse.json(
          { ...external, secret: `${SECRET}rotated` },
          { status: 201 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderWithQueryClient(<WebhookEndpointCard />);

    const url = await screen.findByLabelText('URL');
    await user.clear(url);
    await user.type(url, 'https://erp.example.com/new-hook');
    await user.click(screen.getByRole('button', { name: 'Rotate' }));
    await user.click(screen.getByRole('button', { name: 'Rotate secret' }));

    expect(await screen.findByText(`${SECRET}rotated`)).toBeInTheDocument();
    expect(url).toHaveValue('https://erp.example.com/new-hook');
  });

  it('shows the inbox badge and no inbox button when the URL is the inbox', async () => {
    serveEndpoint({ ...external, url: INBOX_URL });
    renderWithQueryClient(<WebhookEndpointCard />);

    expect(await screen.findByText('Inbox')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Use test inbox' }),
    ).not.toBeInTheDocument();
  });

  it('shows an unsafe URL rejected by the server inline', async () => {
    server.use(
      http.patch(`${API_URL}/webhooks/endpoint`, () =>
        HttpResponse.json(
          {
            statusCode: 400,
            message: 'The URL resolves to a non-public address',
          },
          { status: 400 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderWithQueryClient(<WebhookEndpointCard />);

    const url = await screen.findByLabelText('URL');
    await user.clear(url);
    await user.type(url, 'https://10.0.0.1/hook');
    await user.click(screen.getByRole('button', { name: 'Save endpoint' }));

    await waitFor(() =>
      expect(url).toHaveAccessibleDescription(
        'The URL resolves to a non-public address',
      ),
    );
    expect(url).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getAllByRole('alert')).toHaveLength(1);
  });

  it('requires at least one event before saving', async () => {
    let saved = false;
    server.use(
      http.patch(`${API_URL}/webhooks/endpoint`, () => {
        saved = true;
        return HttpResponse.json(external);
      }),
    );
    const user = userEvent.setup();
    renderWithQueryClient(<WebhookEndpointCard />);

    await user.click(
      await screen.findByRole('checkbox', { name: 'shipment.created' }),
    );
    await user.click(
      screen.getByRole('checkbox', { name: 'shipment.status_changed' }),
    );
    await user.click(screen.getByRole('button', { name: 'Save endpoint' }));

    expect(
      await screen.findByText('Choose at least one event'),
    ).toBeInTheDocument();
    expect(saved).toBe(false);
  });
});
