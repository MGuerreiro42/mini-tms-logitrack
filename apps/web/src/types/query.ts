export interface QuerySource<T> {
  data: T | undefined;
  error: unknown;
  refetch: () => unknown;
}
