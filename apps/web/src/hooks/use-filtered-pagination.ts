'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ALL } from '@/lib/filters';

const PAGE_SIZE = 20;
const PAGE_PARAM = 'page';

type QueryFilters<F> = {
  [K in keyof F]: Exclude<F[K], typeof ALL> | undefined;
};

export function useFilteredPagination<F extends Record<string, string>>(
  defaultFilters: F,
) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filters = Object.fromEntries(
    Object.entries(defaultFilters).map(([key, fallback]) => [
      key,
      searchParams.get(key) ?? fallback,
    ]),
  ) as F;
  const page = Math.max(
    1,
    Number.parseInt(searchParams.get(PAGE_PARAM) ?? '', 10) || 1,
  );

  function update(change: (next: URLSearchParams) => void) {
    const next = new URLSearchParams(searchParams.toString());
    change(next);
    const search = next.toString();
    router.replace(search ? `${pathname}?${search}` : pathname, {
      scroll: false,
    });
  }

  function setFilter<K extends keyof F & string>(key: K, value: F[K]) {
    update((next) => {
      if (value === defaultFilters[key]) next.delete(key);
      else next.set(key, value);
      next.delete(PAGE_PARAM);
    });
  }

  function setPage(nextPage: number) {
    update((next) => {
      if (nextPage <= 1) next.delete(PAGE_PARAM);
      else next.set(PAGE_PARAM, String(nextPage));
    });
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
