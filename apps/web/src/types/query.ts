// The slice of a query result that QueryState and combineQueries share.
export interface QuerySource<T> {
  data: T | undefined;
  error: unknown;
  refetch: () => unknown;
}
