import { apiClient } from '@/services/api-client';
import {
  approveCarrier,
  getCarrier,
  getMyCarrier,
  getMyCarrierModalities,
  getMyCoverageAreas,
  listCarriers,
  rejectCarrier,
  setMyCarrierModalities,
  setMyCoverageAreas,
  signupCarrier,
} from './index';

vi.mock('@/services/api-client', () => ({ apiClient: vi.fn() }));

describe('carriers api', () => {
  beforeEach(() => {
    vi.mocked(apiClient).mockReset();
  });

  it('signupCarrier posts to /carriers with no token', async () => {
    const input = {
      email: 'manager@example.com',
      password: 'password123',
      companyName: 'Fast Freight',
      document: '12345678000199',
    };
    await signupCarrier(input);

    expect(apiClient).toHaveBeenCalledWith('/carriers', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  });

  it('listCarriers omits query params that are not provided', async () => {
    await listCarriers({}, 'token');

    expect(apiClient).toHaveBeenCalledWith('/carriers', undefined, 'token');
  });

  it('listCarriers includes only the query params that are provided', async () => {
    await listCarriers({ status: 'PENDING', page: 2, limit: 10 }, 'token');

    expect(apiClient).toHaveBeenCalledWith(
      '/carriers?status=PENDING&page=2&limit=10',
      undefined,
      'token',
    );
  });

  it('getCarrier gets /carriers/:id', async () => {
    await getCarrier('carrier-1', 'token');

    expect(apiClient).toHaveBeenCalledWith(
      '/carriers/carrier-1',
      undefined,
      'token',
    );
  });

  it('approveCarrier patches /carriers/:id/approve', async () => {
    await approveCarrier('carrier-1', 'token');

    expect(apiClient).toHaveBeenCalledWith(
      '/carriers/carrier-1/approve',
      { method: 'PATCH' },
      'token',
    );
  });

  it('rejectCarrier patches /carriers/:id/reject', async () => {
    await rejectCarrier('carrier-1', 'token');

    expect(apiClient).toHaveBeenCalledWith(
      '/carriers/carrier-1/reject',
      { method: 'PATCH' },
      'token',
    );
  });

  it('getMyCarrier gets /carriers/me', async () => {
    await getMyCarrier('token');

    expect(apiClient).toHaveBeenCalledWith('/carriers/me', undefined, 'token');
  });

  it('getMyCarrierModalities gets /carriers/me/modalities', async () => {
    await getMyCarrierModalities('token');

    expect(apiClient).toHaveBeenCalledWith(
      '/carriers/me/modalities',
      undefined,
      'token',
    );
  });

  it('setMyCarrierModalities puts the full replacement set', async () => {
    await setMyCarrierModalities(['modality-1', 'modality-2'], 'token');

    expect(apiClient).toHaveBeenCalledWith(
      '/carriers/me/modalities',
      {
        method: 'PUT',
        body: JSON.stringify({ modalityIds: ['modality-1', 'modality-2'] }),
      },
      'token',
    );
  });

  it('getMyCoverageAreas gets /carriers/me/coverage-areas', async () => {
    await getMyCoverageAreas('token');

    expect(apiClient).toHaveBeenCalledWith(
      '/carriers/me/coverage-areas',
      undefined,
      'token',
    );
  });

  it('setMyCoverageAreas puts the full replacement set', async () => {
    const areas = [{ state: 'SP', city: 'São Paulo' }];
    await setMyCoverageAreas(areas, 'token');

    expect(apiClient).toHaveBeenCalledWith(
      '/carriers/me/coverage-areas',
      { method: 'PUT', body: JSON.stringify({ areas }) },
      'token',
    );
  });
});
