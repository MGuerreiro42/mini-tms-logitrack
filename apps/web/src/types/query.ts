export interface SinceQuery {
  since?: string;
}

export interface QuerySource<T> {
  data: T | undefined;
  error: unknown;
  refetch: () => unknown;
}
