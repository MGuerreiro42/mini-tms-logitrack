import type { ModalityToggle } from '@/features/modalities/types';
import type { StatsWindow } from '@/hooks/use-stats-window';
import { apiClient, toQueryString } from '@/services/api-client';
import type { Paginated } from '@/types/pagination';
import type {
  ApprovalStatusCounts,
  Carrier,
  CarrierPerformance,
  CarrierSignupInput,
  CoverageArea,
  CoverageAreaInput,
  ListCarriersQuery,
  TeamMember,
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
  return apiClient<Paginated<Carrier>>(
    `/carriers${toQueryString({ ...query })}`,
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

// Without a carrier id, the signed-in user's own carrier (me/*); with one, the admin's read.
const carrierPath = (carrierId?: string) => `/carriers/${carrierId ?? 'me'}`;

export function getCarrierPerformance(
  statsWindow: StatsWindow,
  token: string,
  carrierId?: string,
): Promise<CarrierPerformance> {
  return apiClient<CarrierPerformance>(
    `${carrierPath(carrierId)}/performance${toQueryString({ window: statsWindow })}`,
    undefined,
    token,
  );
}

export function getOperatorRanking(
  statsWindow: StatsWindow,
  token: string,
  carrierId?: string,
): Promise<TeamMember[]> {
  return apiClient<TeamMember[]>(
    `${carrierPath(carrierId)}/operator-ranking${toQueryString({ window: statsWindow })}`,
    undefined,
    token,
  );
}

export function getCarrierCoverageAreas(
  carrierId: string,
  token: string,
): Promise<CoverageArea[]> {
  return apiClient<CoverageArea[]>(
    `${carrierPath(carrierId)}/coverage-areas`,
    undefined,
    token,
  );
}

export function getCarrierModalities(
  carrierId: string,
  token: string,
): Promise<ModalityToggle[]> {
  return apiClient<ModalityToggle[]>(
    `${carrierPath(carrierId)}/modalities`,
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
