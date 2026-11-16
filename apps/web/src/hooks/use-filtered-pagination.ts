'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useEffectEvent } from 'react';
import { ALL, FREE_TEXT } from '@/lib/filters';

const PAGE_SIZE = 20;
const PAGE_PARAM = 'page';

type QueryFilters<F> = {
  [K in keyof F]: Exclude<F[K], typeof ALL> | undefined;
};

type AllowedValues<F> = {
  [K in keyof F]: readonly F[K][] | typeof FREE_TEXT;
};

interface Options<F> {
  // Tab keys: a view is where the user is, not a filter to clear or count.
  viewKeys?: (keyof F)[];
}

export function useFilteredPagination<F extends Record<string, string>>(
  defaultFilters: F,
  allowedValues: AllowedValues<F>,
  { viewKeys = [] }: Options<F> = {},
) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const rejected = Object.keys(defaultFilters).filter((key) => {
    const value = searchParams.get(key);
    const allowed = allowedValues[key];
    return (
      value !== null &&
      allowed !== FREE_TEXT &&
      !allowed.includes(value as F[string])
    );
  });
  const filters = Object.fromEntries(
    Object.entries(defaultFilters).map(([key, fallback]) => [
      key,
      rejected.includes(key) ? fallback : (searchParams.get(key) ?? fallback),
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

  function setFilters(changes: Partial<F>) {
    update((next) => {
      for (const [key, value] of Object.entries(changes)) {
        if (value === undefined || value === defaultFilters[key])
          next.delete(key);
        else next.set(key, value);
      }
      next.delete(PAGE_PARAM);
    });
  }

  function setFilter<K extends keyof F & string>(key: K, value: F[K]) {
    setFilters({ [key]: value } as unknown as Partial<F>);
  }

  const filterKeys = Object.keys(defaultFilters).filter(
    (key) => !viewKeys.includes(key),
  );

  function clearFilters() {
    update((next) => {
      for (const key of filterKeys) next.delete(key);
      next.delete(PAGE_PARAM);
    });
  }

  function setPage(nextPage: number) {
    update((next) => {
      if (nextPage <= 1) next.delete(PAGE_PARAM);
      else next.set(PAGE_PARAM, String(nextPage));
    });
  }

  const dropRejected = useEffectEvent(() =>
    update((next) => {
      for (const key of rejected) next.delete(key);
      next.delete(PAGE_PARAM);
    }),
  );
  const rejectedKeys = rejected.join();

  useEffect(() => {
    if (rejectedKeys) dropRejected();
  }, [rejectedKeys]);

  const query = Object.fromEntries(
    Object.entries(filters).map(([key, value]) => [
      key,
      value === ALL || value === '' ? undefined : value,
    ]),
  ) as QueryFilters<F>;

  return {
    filters,
    defaults: defaultFilters,
    isFiltered: filterKeys.some((key) => filters[key] !== defaultFilters[key]),
    setFilter,
    setFilters,
    clearFilters,
    setPage,
    params: { ...query, page, limit: PAGE_SIZE },
  };
}
