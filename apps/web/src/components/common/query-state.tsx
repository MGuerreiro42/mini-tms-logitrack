'use client';

import type { ReactNode } from 'react';
import { EmptyState, ErrorState } from '@/components/common/feedback-state';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { HTTP_STATUS } from '@/lib/http-status';
import { cn } from '@/lib/utils';
import { ApiError } from '@/services/api-client';
import type { QuerySource } from '@/types/query';

const FORBIDDEN_MESSAGE = "You don't have access to this.";

interface QueryStateProps<T> {
  query: QuerySource<T>;
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

  const status =
    query.error instanceof ApiError ? query.error.statusCode : undefined;
  if (status === HTTP_STATUS.NOT_FOUND || status === HTTP_STATUS.FORBIDDEN) {
    return (
      <EmptyState
        title={
          status === HTTP_STATUS.NOT_FOUND ? notFoundMessage : FORBIDDEN_MESSAGE
        }
      />
    );
  }

  return (
    <ErrorState
      title={errorMessage}
      description={
        status === undefined
          ? "The server couldn't be reached. Nothing was changed."
          : "The server couldn't finish the request. Nothing was changed."
      }
      actions={
        <Button variant="strong" onClick={() => query.refetch()}>
          Try again
        </Button>
      }
    />
  );
}

const ROW_WIDTHS = [
  ['w-36', 'w-44', 'w-24'],
  ['w-32', 'w-28', 'w-28'],
  ['w-40', 'w-48', 'w-20'],
  ['w-36', 'w-40', 'w-24'],
  ['w-28', 'w-32', 'w-24'],
  ['w-40', 'w-44', 'w-16'],
];

export function QuerySkeleton({
  variant = 'panel',
}: {
  variant?: 'panel' | 'table' | 'lines';
}) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={cn(
        variant !== 'lines' &&
          'overflow-hidden rounded-xl bg-card shadow-panel',
      )}
    >
      {variant === 'table' ? (
        <>
          <div className="flex h-10 items-center gap-10 border-b px-5">
            {['w-16', 'w-24', 'w-18', 'w-14'].map((width) => (
              <Skeleton key={width} className={cn('h-2.5', width)} />
            ))}
          </div>
          {ROW_WIDTHS.map(([code, place, meta]) => (
            <div
              key={code + place + meta}
              className="flex h-12 items-center gap-10 border-b border-muted px-5 last:border-0"
            >
              <Skeleton className={cn('h-3', code)} />
              <Skeleton className={cn('h-3', place)} />
              <Skeleton className="h-5.5 w-21" />
              <Skeleton className={cn('h-3', meta)} />
            </div>
          ))}
        </>
      ) : (
        <div className={cn('space-y-4', variant === 'panel' && 'p-5')}>
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-3/4" />
          <Skeleton className="h-3 w-2/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      )}
    </div>
  );
}
