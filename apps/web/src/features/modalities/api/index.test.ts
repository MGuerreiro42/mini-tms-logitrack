import { apiClient } from '@/services/api-client';
import { getDeliveryModalities } from './index';

vi.mock('@/services/api-client', () => ({ apiClient: vi.fn() }));

describe('modalities api', () => {
  it('getDeliveryModalities gets /delivery-modalities', async () => {
    await getDeliveryModalities('token');

    expect(apiClient).toHaveBeenCalledWith(
      '/delivery-modalities',
      undefined,
      'token',
    );
  });
});
