import type { PaginationQuery } from '@/types/pagination';
import { fetchAllPages } from './fetch-all-pages';

function pagedSource(total: number) {
  return vi.fn(async ({ page, limit }: Required<PaginationQuery>) => ({
    data: Array.from(
      { length: Math.min(limit, total - (page - 1) * limit) },
      (_, index) => (page - 1) * limit + index,
    ),
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  }));
}

describe('fetchAllPages', () => {
  it('asks once when everything fits the first page', async () => {
    const fetchPage = pagedSource(3);

    expect(await fetchAllPages(fetchPage)).toEqual([0, 1, 2]);
    expect(fetchPage).toHaveBeenCalledExactlyOnceWith({ page: 1, limit: 100 });
  });

  it('walks every remaining page instead of truncating at the page size', async () => {
    const fetchPage = pagedSource(250);

    const rows = await fetchAllPages(fetchPage);

    expect(rows).toHaveLength(250);
    expect(rows.at(-1)).toBe(249);
    expect(fetchPage).toHaveBeenCalledTimes(3);
  });

  it('returns nothing for an empty collection', async () => {
    expect(await fetchAllPages(pagedSource(0))).toEqual([]);
  });
});
