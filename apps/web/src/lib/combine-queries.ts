import type { QuerySource } from '@/types/query';

interface QueryLike {
  data: unknown;
  error: unknown;
  refetch: () => unknown;
}

type DataTuple<R extends readonly QueryLike[]> = {
  [K in keyof R]: NonNullable<R[K]['data']>;
};

// Folds parallel queries into one source: data only once every query has it, the first error otherwise.
export function combineQueries<const R extends readonly QueryLike[], T>(
  results: R,
  select: (data: DataTuple<R>) => T,
): QuerySource<T> {
  const ready = results.every((result) => result.data !== undefined);
  return {
    data: ready
      ? select(results.map((result) => result.data) as DataTuple<R>)
      : undefined,
    error: results.find((result) => result.error)?.error ?? null,
    refetch: () => {
      for (const result of results) result.refetch();
    },
  };
}
