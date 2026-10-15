'use client';

import { useCarriersList } from '@/features/carriers/hooks/use-carriers-list';
import { useSellersList } from '@/features/sellers/hooks/use-sellers-list';
import { combineQueries } from '@/lib/combine-queries';

export type ApplicationKind = 'seller' | 'carrier';

export interface Application {
  id: string;
  kind: ApplicationKind;
  companyName: string;
  document: string;
  createdAt: string;
}

const PENDING_PAGE = { status: 'PENDING', page: 1, limit: 5 } as const;

export function usePendingApplications() {
  return combineQueries(
    [useSellersList(PENDING_PAGE), useCarriersList(PENDING_PAGE)] as const,
    ([sellers, carriers]): Application[] =>
      [
        ...sellers.data.map((row) => ({ ...row, kind: 'seller' as const })),
        ...carriers.data.map((row) => ({ ...row, kind: 'carrier' as const })),
      ].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  );
}
