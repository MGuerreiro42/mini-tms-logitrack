import type { ListSellersQuery } from '../types';

export const sellerKeys = {
  all: ['sellers'] as const,
  list: (query: ListSellersQuery) =>
    [...sellerKeys.all, 'list', query] as const,
  detail: (id: string) => [...sellerKeys.all, 'detail', id] as const,
  statusCounts: () => [...sellerKeys.all, 'status-counts'] as const,
  me: () => [...sellerKeys.all, 'me'] as const,
  myModalities: () => [...sellerKeys.me(), 'modalities'] as const,
};
