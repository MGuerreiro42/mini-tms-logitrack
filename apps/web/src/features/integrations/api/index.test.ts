import { apiClient } from '@/services/api-client';
import {
  createApiKey,
  getWebhookEndpoint,
  getWebhookInbox,
  listApiKeys,
  listWebhookDeliveries,
  replayWebhookDelivery,
  revokeApiKey,
  rotateWebhookSecret,
  updateWebhookEndpoint,
  updateWebhookInbox,
} from './index';

vi.mock('@/services/api-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/api-client')>()),
  apiClient: vi.fn(),
}));

describe('integrations api', () => {
  beforeEach(() => {
    vi.mocked(apiClient).mockReset();
  });

  it('listApiKeys gets /api-keys', async () => {
    await listApiKeys('token');

    expect(apiClient).toHaveBeenCalledWith('/api-keys', undefined, 'token');
  });

  it('createApiKey posts the name to /api-keys', async () => {
    await createApiKey('ERP sync', 'token');

    expect(apiClient).toHaveBeenCalledWith(
      '/api-keys',
      { method: 'POST', body: JSON.stringify({ name: 'ERP sync' }) },
      'token',
    );
  });

  it('revokeApiKey deletes /api-keys/:id', async () => {
    await revokeApiKey('key-1', 'token');

    expect(apiClient).toHaveBeenCalledWith(
      '/api-keys/key-1',
      { method: 'DELETE' },
      'token',
    );
  });

  it('getWebhookEndpoint gets /webhooks/endpoint', async () => {
    await getWebhookEndpoint('token');

    expect(apiClient).toHaveBeenCalledWith(
      '/webhooks/endpoint',
      undefined,
      'token',
    );
  });

  it('updateWebhookEndpoint patches only the given fields', async () => {
    await updateWebhookEndpoint({ url: 'https://erp.example.com' }, 'token');

    expect(apiClient).toHaveBeenCalledWith(
      '/webhooks/endpoint',
      {
        method: 'PATCH',
        body: JSON.stringify({ url: 'https://erp.example.com' }),
      },
      'token',
    );
  });

  it('rotateWebhookSecret posts to /webhooks/endpoint/rotate-secret', async () => {
    await rotateWebhookSecret('token');

    expect(apiClient).toHaveBeenCalledWith(
      '/webhooks/endpoint/rotate-secret',
      { method: 'POST' },
      'token',
    );
  });

  it('listWebhookDeliveries omits query params that are not provided', async () => {
    await listWebhookDeliveries({}, 'token');

    expect(apiClient).toHaveBeenCalledWith(
      '/webhooks/deliveries',
      undefined,
      'token',
    );
  });

  it('listWebhookDeliveries includes the status and page', async () => {
    await listWebhookDeliveries(
      { status: 'FAILED', page: 2, limit: 20 },
      'token',
    );

    expect(apiClient).toHaveBeenCalledWith(
      '/webhooks/deliveries?status=FAILED&page=2&limit=20',
      undefined,
      'token',
    );
  });

  it('replayWebhookDelivery posts to /webhooks/deliveries/:id/replay', async () => {
    await replayWebhookDelivery('delivery-1', 'token');

    expect(apiClient).toHaveBeenCalledWith(
      '/webhooks/deliveries/delivery-1/replay',
      { method: 'POST' },
      'token',
    );
  });

  it('getWebhookInbox gets /webhooks/inbox', async () => {
    await getWebhookInbox('token');

    expect(apiClient).toHaveBeenCalledWith(
      '/webhooks/inbox',
      undefined,
      'token',
    );
  });

  it('updateWebhookInbox patches failRequests', async () => {
    await updateWebhookInbox(true, 'token');

    expect(apiClient).toHaveBeenCalledWith(
      '/webhooks/inbox',
      { method: 'PATCH', body: JSON.stringify({ failRequests: true }) },
      'token',
    );
  });
});
