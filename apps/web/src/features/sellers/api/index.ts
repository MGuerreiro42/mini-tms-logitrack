import type { ModalityToggle } from '@/features/modalities/types';
import { apiClient } from '@/services/api-client';
import type { Paginated } from '@/types/pagination';
import type {
  ApprovalStatusCounts,
  ListSellersQuery,
  Seller,
  SellerSignupInput,
} from '../types';

export function signupSeller(input: SellerSignupInput): Promise<Seller> {
  return apiClient<Seller>('/sellers', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function listSellers(
  query: ListSellersQuery,
  token: string,
): Promise<Paginated<Seller>> {
  const params = new URLSearchParams();
  if (query.status) params.set('status', query.status);
  if (query.page) params.set('page', String(query.page));
  if (query.limit) params.set('limit', String(query.limit));
  const qs = params.toString();
  return apiClient<Paginated<Seller>>(
    `/sellers${qs ? `?${qs}` : ''}`,
    undefined,
    token,
  );
}

export function getSeller(id: string, token: string): Promise<Seller> {
  return apiClient<Seller>(`/sellers/${id}`, undefined, token);
}

export function getSellerStatusCounts(
  token: string,
): Promise<ApprovalStatusCounts> {
  return apiClient<ApprovalStatusCounts>(
    '/sellers/status-counts',
    undefined,
    token,
  );
}

export function approveSeller(id: string, token: string): Promise<Seller> {
  return apiClient<Seller>(
    `/sellers/${id}/approve`,
    { method: 'PATCH' },
    token,
  );
}

export function rejectSeller(id: string, token: string): Promise<Seller> {
  return apiClient<Seller>(`/sellers/${id}/reject`, { method: 'PATCH' }, token);
}

export function getMySeller(token: string): Promise<Seller> {
  return apiClient<Seller>('/sellers/me', undefined, token);
}

export function getMyModalities(token: string): Promise<ModalityToggle[]> {
  return apiClient<ModalityToggle[]>(
    '/sellers/me/modalities',
    undefined,
    token,
  );
}

export function setMyModalities(
  modalityIds: string[],
  token: string,
): Promise<ModalityToggle[]> {
  return apiClient<ModalityToggle[]>(
    '/sellers/me/modalities',
    { method: 'PUT', body: JSON.stringify({ modalityIds }) },
    token,
  );
}
