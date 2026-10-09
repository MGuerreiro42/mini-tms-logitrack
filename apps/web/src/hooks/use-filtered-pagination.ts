'use client';

import { useState } from 'react';

const ALL = 'ALL';
const PAGE_SIZE = 20;

type QueryFilters<F> = {
  [K in keyof F]: Exclude<F[K], typeof ALL> | undefined;
};

export function useFilteredPagination<F extends Record<string, string>>(
  initialFilters: F,
) {
  const [filters, setFilters] = useState(initialFilters);
  const [page, setPage] = useState(1);

  function setFilter<K extends keyof F>(key: K, value: F[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  }

  const query = Object.fromEntries(
    Object.entries(filters).map(([key, value]) => [
      key,
      value === ALL ? undefined : value,
    ]),
  ) as QueryFilters<F>;

  return {
    filters,
    setFilter,
    setPage,
    params: { ...query, page, limit: PAGE_SIZE },
  };
}
