import { apiClient } from '@/services/api-client';
import {
  claimShipment,
  createShipment,
  getEligibleCarriers,
  getQueueShipment,
  getShipment,
  listQueue,
  listShipments,
  updateShipmentStatus,
} from './index';

vi.mock('@/services/api-client', () => ({ apiClient: vi.fn() }));

describe('shipments api', () => {
  beforeEach(() => {
    vi.mocked(apiClient).mockReset();
  });

  it('getEligibleCarriers builds the query string from state/city/modalityId', async () => {
    await getEligibleCarriers('SP', 'São Paulo', 'modality-1', 'token');

    expect(apiClient).toHaveBeenCalledWith(
      '/shipments/eligible-carriers?state=SP&city=S%C3%A3o+Paulo&modalityId=modality-1',
      undefined,
      'token',
    );
  });

  it('createShipment posts to /shipments', async () => {
    const input = {
      addressStreet: 'Av. Paulista',
      addressNumber: '1000',
      addressNeighborhood: 'Bela Vista',
      addressCity: 'São Paulo',
      addressState: 'SP',
      addressZipCode: '01310-100',
      modalityId: 'modality-1',
      carrierId: 'carrier-1',
    };
    await createShipment(input, 'token');

    expect(apiClient).toHaveBeenCalledWith(
      '/shipments',
      { method: 'POST', body: JSON.stringify(input) },
      'token',
    );
  });

  it('listShipments omits query params that are not provided', async () => {
    await listShipments({}, 'token');

    expect(apiClient).toHaveBeenCalledWith('/shipments', undefined, 'token');
  });

  it('listShipments includes only the query params that are provided', async () => {
    await listShipments({ status: 'DELIVERED', page: 1, limit: 20 }, 'token');

    expect(apiClient).toHaveBeenCalledWith(
      '/shipments?status=DELIVERED&page=1&limit=20',
      undefined,
      'token',
    );
  });

  it('getShipment gets /shipments/:id', async () => {
    await getShipment('shipment-1', 'token');

    expect(apiClient).toHaveBeenCalledWith(
      '/shipments/shipment-1',
      undefined,
      'token',
    );
  });

  it('listQueue omits query params that are not provided', async () => {
    await listQueue({}, 'token');

    expect(apiClient).toHaveBeenCalledWith(
      '/shipments/queue',
      undefined,
      'token',
    );
  });

  it('listQueue includes only the query params that are provided', async () => {
    await listQueue({ status: 'ACCEPTED', page: 2, limit: 10 }, 'token');

    expect(apiClient).toHaveBeenCalledWith(
      '/shipments/queue?status=ACCEPTED&page=2&limit=10',
      undefined,
      'token',
    );
  });

  it('getQueueShipment gets /shipments/queue/:id', async () => {
    await getQueueShipment('shipment-1', 'token');

    expect(apiClient).toHaveBeenCalledWith(
      '/shipments/queue/shipment-1',
      undefined,
      'token',
    );
  });

  it('claimShipment patches /shipments/:id/claim', async () => {
    await claimShipment('shipment-1', 'token');

    expect(apiClient).toHaveBeenCalledWith(
      '/shipments/shipment-1/claim',
      { method: 'PATCH' },
      'token',
    );
  });

  it('updateShipmentStatus patches /shipments/:id/status with the body', async () => {
    await updateShipmentStatus(
      'shipment-1',
      { status: 'COLLECTED', note: 'left the seller' },
      'token',
    );

    expect(apiClient).toHaveBeenCalledWith(
      '/shipments/shipment-1/status',
      {
        method: 'PATCH',
        body: JSON.stringify({ status: 'COLLECTED', note: 'left the seller' }),
      },
      'token',
    );
  });
});
