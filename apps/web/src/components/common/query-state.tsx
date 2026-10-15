'use client';

import type { ReactNode } from 'react';
import { Alert, AlertAction, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiError } from '@/services/api-client';

export interface QueryStateSource<T> {
  data: T | undefined;
  error: unknown;
  refetch: () => unknown;
}

interface QueryStateProps<T> {
  query: QueryStateSource<T>;
  children: (data: T) => ReactNode;
  errorMessage?: string;
  notFoundMessage?: string;
  skeleton?: ReactNode;
}

export function QueryState<T>({
  query,
  children,
  errorMessage = "Couldn't load this data.",
  notFoundMessage = 'Not found.',
  skeleton = <QuerySkeleton />,
}: QueryStateProps<T>) {
  // Data wins over error so a failed background refetch keeps the last good render.
  if (query.data !== undefined) return children(query.data);

  if (!query.error) return skeleton;

  if (query.error instanceof ApiError && query.error.statusCode === 404) {
    return (
      <div className="rounded-xl border border-dashed py-16 text-center text-sm text-muted-foreground">
        {notFoundMessage}
      </div>
    );
  }

  return (
    <Alert variant="destructive">
      <AlertDescription>{errorMessage}</AlertDescription>
      <AlertAction>
        <Button size="sm" variant="outline" onClick={() => query.refetch()}>
          Retry
        </Button>
      </AlertAction>
    </Alert>
  );
}

function QuerySkeleton() {
  return (
    <div role="status" aria-label="Loading" className="space-y-3">
      <Skeleton className="h-6 w-1/3" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
    </div>
  );
}
