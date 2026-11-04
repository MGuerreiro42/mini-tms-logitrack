import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { setSession } from '@/lib/session';
import { server } from '@/test/msw/server';
import { renderWithQueryClient } from '@/test/render';
import type { ApiKey } from '../types';
import { ApiKeysPanel } from './api-keys-panel';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const API_URL = 'http://localhost:3333';
const FULL_KEY = 'tms_Q2x9bA1kSecretPartThatIsShownOnce';

const erpKey: ApiKey = {
  id: 'key-1',
  name: 'ERP sync',
  prefix: 'tms_Q2x9bA1k',
  lastUsedAt: null,
  createdAt: '2026-11-04T12:00:00.000Z',
};

describe('ApiKeysPanel', () => {
  beforeEach(() => {
    setSession({
      token: 't',
      role: 'SELLER',
      userId: 'user-1',
      email: 'seller@example.com',
    });
  });

  it('shows a created key once, copies it, and lists only its prefix after closing', async () => {
    let keys: ApiKey[] = [];
    let body: unknown;
    server.use(
      http.get(`${API_URL}/api-keys`, () => HttpResponse.json(keys)),
      http.post(`${API_URL}/api-keys`, async ({ request }) => {
        body = await request.json();
        keys = [erpKey];
        return HttpResponse.json({ ...erpKey, key: FULL_KEY }, { status: 201 });
      }),
    );
    const user = userEvent.setup();
    renderWithQueryClient(<ApiKeysPanel />);

    await screen.findByText(/No API keys yet/);
    await user.click(screen.getByRole('button', { name: 'Create key' }));
    await user.type(screen.getByLabelText('Name'), 'ERP sync');
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Create key',
      }),
    );

    const dialog = await screen.findByRole('dialog', {
      name: 'API key created',
    });
    expect(within(dialog).getByText(FULL_KEY)).toBeInTheDocument();
    const copy = within(dialog).getByRole('button', { name: 'Copy API key' });
    expect(copy).toHaveFocus();
    expect(copy).toHaveAccessibleDescription(
      "ERP sync — copy it now; you won't see it again.",
    );
    expect(body).toEqual({ name: 'ERP sync' });

    // A click outside the dialog lands on the inert page behind it.
    await userEvent.setup({ pointerEventsCheck: 0 }).click(document.body);
    expect(dialog).toBeInTheDocument();

    await user.click(copy);
    expect(await navigator.clipboard.readText()).toBe(FULL_KEY);

    await user.click(within(dialog).getByRole('button', { name: 'Done' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(await screen.findByText('tms_Q2x9bA1k…')).toBeInTheDocument();
    expect(screen.queryByText(FULL_KEY)).not.toBeInTheDocument();
    expect(screen.getByText(/Last used Never/)).toBeInTheDocument();
  });

  it('revokes a key after confirming and removes it from the list', async () => {
    let keys = [erpKey];
    let revoked: string | undefined;
    server.use(
      http.get(`${API_URL}/api-keys`, () => HttpResponse.json(keys)),
      http.delete(`${API_URL}/api-keys/:id`, ({ params }) => {
        revoked = params.id as string;
        keys = [];
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const user = userEvent.setup();
    renderWithQueryClient(<ApiKeysPanel />);

    await user.click(
      await screen.findByRole('button', { name: 'Revoke ERP sync' }),
    );
    await user.click(screen.getByRole('button', { name: 'Revoke key' }));

    await waitFor(() => expect(revoked).toBe('key-1'));
    expect(await screen.findByText(/No API keys yet/)).toBeInTheDocument();
    expect(screen.queryByText('ERP sync')).not.toBeInTheDocument();
  });
});
