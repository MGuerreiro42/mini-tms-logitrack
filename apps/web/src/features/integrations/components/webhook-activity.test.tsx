import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { setSession } from '@/lib/session';
import { getSocket } from '@/services/websocket-client';
import { makeFakeSocket } from '@/test/fake-socket';
import { server } from '@/test/msw/server';
import { resetNavigation } from '@/test/navigation';
import { renderWithQueryClient } from '@/test/render';
import type {
  WebhookDelivery,
  WebhookEndpoint,
  WebhookInboxRequest,
} from '../types';
import { WebhookActivity } from './webhook-activity';

vi.mock('@/services/websocket-client', async (importOriginal) => ({
  ...(await importOriginal()),
  getSocket: vi.fn(),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const API_URL = 'http://localhost:3333';
const INBOX_URL = `${API_URL}/webhook-inbox/7f0c2a4e-0000-4000-8000-000000000001`;

const endpoint: WebhookEndpoint = {
  url: INBOX_URL,
  events: ['SHIPMENT_CREATED', 'SHIPMENT_STATUS_CHANGED'],
  active: true,
  secret: 'whsec_test-secret',
  inboxUrl: INBOX_URL,
};

const pending: WebhookDelivery = {
  id: 'delivery-1',
  event: 'SHIPMENT_STATUS_CHANGED',
  status: 'PENDING',
  attempts: 0,
  responseCode: null,
  durationMs: null,
  error: null,
  nextAttemptAt: null,
  payload: {},
  createdAt: new Date().toISOString(),
};

function inboxRequest(
  id: string,
  signatureValid: boolean,
  responseStatus = 200,
): WebhookInboxRequest {
  return {
    id,
    receivedAt: new Date().toISOString(),
    webhookId: `msg_${id}`,
    body: `{"type":"shipment.status_changed","id":"${id}"}`,
    signatureValid,
    responseStatus,
  };
}

function page(data: WebhookDelivery[]) {
  return {
    data,
    meta: { total: data.length, page: 1, limit: 20, totalPages: 1 },
  };
}

const REPLAY = /^Replay shipment\.status_changed from /;

function deliveryRow() {
  return screen
    .getByRole('button', { name: REPLAY })
    .closest('tr') as HTMLElement;
}

describe('WebhookActivity', () => {
  let socket: ReturnType<typeof makeFakeSocket>;
  let deliveryRequests: number;
  let inboxRequests: number;

  beforeEach(() => {
    socket = makeFakeSocket();
    vi.mocked(getSocket).mockReturnValue(socket as never);
    setSession({
      token: 't',
      role: 'SELLER',
      userId: 'user-1',
      email: 'seller@example.com',
    });
    deliveryRequests = 0;
    inboxRequests = 0;
    server.use(
      http.get(`${API_URL}/webhooks/endpoint`, () =>
        HttpResponse.json(endpoint),
      ),
      http.get(`${API_URL}/webhooks/deliveries`, () => {
        deliveryRequests++;
        return HttpResponse.json(page([pending]));
      }),
      http.get(`${API_URL}/webhooks/inbox`, () => {
        inboxRequests++;
        return HttpResponse.json({
          failRequests: false,
          requests: [inboxRequest('old', true)],
        });
      }),
    );
  });

  async function goLive() {
    act(() => socket.trigger('connect'));
    await act(async () => socket.ackAll({ ok: true }));
  }

  it('goes live on the seller room and refetches both lists', async () => {
    renderWithQueryClient(<WebhookActivity />);
    await screen.findByRole('log', { name: 'Inbox requests' });
    await waitFor(() => expect(deliveryRequests).toBe(1));

    await goLive();

    expect(screen.getByRole('status')).toHaveTextContent('Live');
    expect(socket.emit.mock.calls.map(([event]) => event)).toEqual([
      'subscribe:seller',
      'subscribe:seller',
    ]);
    await waitFor(() => expect(deliveryRequests).toBe(2));
    expect(inboxRequests).toBe(2);
  });

  it('prepends an inbox request with its signature result', async () => {
    renderWithQueryClient(<WebhookActivity />);
    const log = await screen.findByRole('log', { name: 'Inbox requests' });
    await goLive();

    act(() =>
      socket.trigger('webhook:inbox', inboxRequest('fresh', false, 500)),
    );

    const items = within(log).getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('shipment.status_changed');
    expect(items[0]).toHaveTextContent('msg_fresh');
    expect(items[0]).toHaveTextContent('500');
    expect(items[0]).toHaveTextContent('Signature invalid');
    expect(items[1]).toHaveTextContent('Signature valid');
  });

  it('updates a delivery row in place from the socket', async () => {
    renderWithQueryClient(<WebhookActivity />);
    await screen.findByRole('button', { name: REPLAY });
    await goLive();
    await waitFor(() => expect(deliveryRequests).toBe(2));
    const nextAttemptAt = new Date(Date.now() + 8_000).toISOString();

    act(() =>
      socket.trigger('webhook:delivery', {
        ...pending,
        attempts: 1,
        responseCode: 500,
        durationMs: 42,
        error: 'HTTP 500',
        nextAttemptAt,
      }),
    );

    const row = deliveryRow();
    expect(within(row).getByText(/^in \d+ s$/)).toHaveAttribute(
      'dateTime',
      nextAttemptAt,
    );
    expect(row).toHaveTextContent('42 ms');
    expect(
      within(row).getByText('HTTP 500', { selector: 'span' }),
    ).toBeInTheDocument();
    expect(deliveryRequests).toBe(2);
  });

  it('refetches a filtered log when a delivery changes status', async () => {
    resetNavigation('/?status=PENDING');
    renderWithQueryClient(<WebhookActivity />);
    await screen.findByRole('button', { name: REPLAY });
    await goLive();
    await waitFor(() => expect(deliveryRequests).toBe(2));

    act(() =>
      socket.trigger('webhook:delivery', {
        ...pending,
        status: 'FAILED',
        attempts: 6,
        error: 'HTTP 500',
      }),
    );

    await waitFor(() => expect(deliveryRequests).toBe(3));
  });

  it('makes the inbox fail requests from the switch', async () => {
    let body: unknown;
    server.use(
      http.patch(`${API_URL}/webhooks/inbox`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ failRequests: true, requests: [] });
      }),
    );
    const user = userEvent.setup();
    renderWithQueryClient(<WebhookActivity />);

    const toggle = await screen.findByRole('switch', { name: 'Fail requests' });
    await waitFor(() => expect(toggle).toBeEnabled());
    await user.click(toggle);

    await waitFor(() => expect(body).toEqual({ failRequests: true }));
  });

  it('replays a delivery and refetches the log', async () => {
    let replayed: string | undefined;
    server.use(
      http.post(`${API_URL}/webhooks/deliveries/:id/replay`, ({ params }) => {
        replayed = params.id as string;
        return HttpResponse.json(
          { ...pending, id: 'delivery-2' },
          { status: 201 },
        );
      }),
    );
    const user = userEvent.setup();
    renderWithQueryClient(<WebhookActivity />);

    await user.click(await screen.findByRole('button', { name: REPLAY }));

    await waitFor(() => expect(replayed).toBe('delivery-1'));
    await waitFor(() => expect(deliveryRequests).toBe(2));
  });

  it('keeps the inbox visible with a hint when the endpoint is elsewhere', async () => {
    server.use(
      http.get(`${API_URL}/webhooks/endpoint`, () =>
        HttpResponse.json({ ...endpoint, url: 'https://erp.example.com/hook' }),
      ),
    );
    renderWithQueryClient(<WebhookActivity />);

    expect(
      await screen.findByText(
        /the inbox only receives while it is the endpoint/,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('log', { name: 'Inbox requests' }),
    ).toBeInTheDocument();
  });

  it('points the endpoint at the test inbox in one click', async () => {
    let body: unknown;
    server.use(
      http.get(`${API_URL}/webhooks/endpoint`, () =>
        HttpResponse.json({ ...endpoint, url: 'https://erp.example.com/hook' }),
      ),
      http.patch(`${API_URL}/webhooks/endpoint`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(endpoint);
      }),
    );
    const user = userEvent.setup();
    renderWithQueryClient(<WebhookActivity />);

    await user.click(
      await screen.findByRole('button', { name: 'Use test inbox' }),
    );

    await waitFor(() => expect(body).toEqual({ url: INBOX_URL }));
    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: 'Use test inbox' }),
      ).not.toBeInTheDocument(),
    );
  });

  it('keeps the log mounted while empty and shows a body as text', async () => {
    const script = '<img src=x onerror=alert(1)>';
    server.use(
      http.get(`${API_URL}/webhooks/inbox`, () =>
        HttpResponse.json({ failRequests: false, requests: [] }),
      ),
    );
    renderWithQueryClient(<WebhookActivity />);
    const log = await screen.findByRole('log', { name: 'Inbox requests' });
    expect(within(log).queryAllByRole('listitem')).toHaveLength(0);
    await goLive();

    act(() =>
      socket.trigger('webhook:inbox', {
        ...inboxRequest('xss', true),
        body: script,
      }),
    );

    const body = within(log).getByRole('region', {
      name: 'Request body',
      hidden: true,
    });
    expect(body).toHaveTextContent(script);
    expect(body.querySelector('img')).toBeNull();
  });
});
