import type { Paginated, PaginationQuery } from '@/types/pagination';

const API_MAX_PAGE_SIZE = 100;

export async function fetchAllPages<T>(
  fetchPage: (query: Required<PaginationQuery>) => Promise<Paginated<T>>,
): Promise<T[]> {
  const first = await fetchPage({ page: 1, limit: API_MAX_PAGE_SIZE });
  const rest = await Promise.all(
    Array.from({ length: Math.max(0, first.meta.totalPages - 1) }, (_, index) =>
      fetchPage({ page: index + 2, limit: API_MAX_PAGE_SIZE }),
    ),
  );
  return [first, ...rest].flatMap((page) => page.data);
}
