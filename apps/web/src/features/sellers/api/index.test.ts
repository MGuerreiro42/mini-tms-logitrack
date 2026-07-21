import { apiClient } from '@/services/api-client';
import {
  approveSeller,
  getMyModalities,
  getMySeller,
  getSeller,
  getSellerStatusCounts,
  listSellers,
  rejectSeller,
  setMyModalities,
  signupSeller,
} from './index';

vi.mock('@/services/api-client', () => ({ apiClient: vi.fn() }));

describe('sellers api', () => {
  beforeEach(() => {
    vi.mocked(apiClient).mockReset();
  });

  it('signupSeller posts to /sellers with no token', async () => {
    const input = {
      email: 'seller@example.com',
      password: 'password123',
      companyName: 'Example Store',
      document: '12345678000199',
    };
    await signupSeller(input);

    expect(apiClient).toHaveBeenCalledWith('/sellers', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  });

  it('listSellers omits query params that are not provided', async () => {
    await listSellers({}, 'token');

    expect(apiClient).toHaveBeenCalledWith('/sellers', undefined, 'token');
  });

  it('listSellers includes only the query params that are provided', async () => {
    await listSellers({ status: 'APPROVED', page: 3, limit: 5 }, 'token');

    expect(apiClient).toHaveBeenCalledWith(
      '/sellers?status=APPROVED&page=3&limit=5',
      undefined,
      'token',
    );
  });

  it('getSeller gets /sellers/:id', async () => {
    await getSeller('seller-1', 'token');

    expect(apiClient).toHaveBeenCalledWith(
      '/sellers/seller-1',
      undefined,
      'token',
    );
  });

  it('getSellerStatusCounts gets /sellers/status-counts', async () => {
    await getSellerStatusCounts('token');

    expect(apiClient).toHaveBeenCalledWith(
      '/sellers/status-counts',
      undefined,
      'token',
    );
  });

  it('approveSeller patches /sellers/:id/approve', async () => {
    await approveSeller('seller-1', 'token');

    expect(apiClient).toHaveBeenCalledWith(
      '/sellers/seller-1/approve',
      { method: 'PATCH' },
      'token',
    );
  });

  it('rejectSeller patches /sellers/:id/reject', async () => {
    await rejectSeller('seller-1', 'token');

    expect(apiClient).toHaveBeenCalledWith(
      '/sellers/seller-1/reject',
      { method: 'PATCH' },
      'token',
    );
  });

  it('getMySeller gets /sellers/me', async () => {
    await getMySeller('token');

    expect(apiClient).toHaveBeenCalledWith('/sellers/me', undefined, 'token');
  });

  it('getMyModalities gets /sellers/me/modalities', async () => {
    await getMyModalities('token');

    expect(apiClient).toHaveBeenCalledWith(
      '/sellers/me/modalities',
      undefined,
      'token',
    );
  });

  it('setMyModalities puts the full replacement set', async () => {
    await setMyModalities(['modality-1'], 'token');

    expect(apiClient).toHaveBeenCalledWith(
      '/sellers/me/modalities',
      { method: 'PUT', body: JSON.stringify({ modalityIds: ['modality-1'] }) },
      'token',
    );
  });
});
