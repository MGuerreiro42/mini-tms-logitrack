import type { ModalityToggle } from '@/features/modalities/types';
import { apiClient } from '@/services/api-client';
import type { Paginated } from '@/types/pagination';
import type {
  ApprovalStatusCounts,
  Carrier,
  CarrierPerformance,
  CarrierSignupInput,
  CoverageArea,
  CoverageAreaInput,
  ListCarriersQuery,
} from '../types';

export function signupCarrier(input: CarrierSignupInput): Promise<Carrier> {
  return apiClient<Carrier>('/carriers', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function listCarriers(
  query: ListCarriersQuery,
  token: string,
): Promise<Paginated<Carrier>> {
  const params = new URLSearchParams();
  if (query.status) params.set('status', query.status);
  if (query.page) params.set('page', String(query.page));
  if (query.limit) params.set('limit', String(query.limit));
  const qs = params.toString();
  return apiClient<Paginated<Carrier>>(
    `/carriers${qs ? `?${qs}` : ''}`,
    undefined,
    token,
  );
}

export function getCarrier(id: string, token: string): Promise<Carrier> {
  return apiClient<Carrier>(`/carriers/${id}`, undefined, token);
}

export function getCarrierStatusCounts(
  token: string,
): Promise<ApprovalStatusCounts> {
  return apiClient<ApprovalStatusCounts>(
    '/carriers/status-counts',
    undefined,
    token,
  );
}

export function approveCarrier(id: string, token: string): Promise<Carrier> {
  return apiClient<Carrier>(
    `/carriers/${id}/approve`,
    { method: 'PATCH' },
    token,
  );
}

export function rejectCarrier(id: string, token: string): Promise<Carrier> {
  return apiClient<Carrier>(
    `/carriers/${id}/reject`,
    { method: 'PATCH' },
    token,
  );
}

export function getMyCarrier(token: string): Promise<Carrier> {
  return apiClient<Carrier>('/carriers/me', undefined, token);
}

export function getMyCarrierModalities(
  token: string,
): Promise<ModalityToggle[]> {
  return apiClient<ModalityToggle[]>(
    '/carriers/me/modalities',
    undefined,
    token,
  );
}

export function setMyCarrierModalities(
  modalityIds: string[],
  token: string,
): Promise<ModalityToggle[]> {
  return apiClient<ModalityToggle[]>(
    '/carriers/me/modalities',
    { method: 'PUT', body: JSON.stringify({ modalityIds }) },
    token,
  );
}

export function getMyCoverageAreas(token: string): Promise<CoverageArea[]> {
  return apiClient<CoverageArea[]>(
    '/carriers/me/coverage-areas',
    undefined,
    token,
  );
}

export function getMyCarrierPerformance(
  token: string,
): Promise<CarrierPerformance> {
  return apiClient<CarrierPerformance>(
    '/carriers/me/performance',
    undefined,
    token,
  );
}

export function setMyCoverageAreas(
  areas: CoverageAreaInput[],
  token: string,
): Promise<CoverageArea[]> {
  return apiClient<CoverageArea[]>(
    '/carriers/me/coverage-areas',
    { method: 'PUT', body: JSON.stringify({ areas }) },
    token,
  );
}
