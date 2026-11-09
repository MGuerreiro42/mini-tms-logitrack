'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import {
  ErrorState,
  SERVICE_UNAVAILABLE,
} from '@/components/common/feedback-state';
import { Button } from '@/components/ui/button';
import { type ApiHealth, useApiHealth } from '@/hooks/use-api-health';
import { useLoggedError } from '@/hooks/use-logged-error';
import { ROUTES } from '@/lib/routes';

export interface SegmentErrorProps {
  error: Error & { digest?: string };
  retry: () => void;
}

function ErrorReference({ digest }: { digest?: string }) {
  if (!digest) return null;

  return (
    <span className="mt-1 block font-mono text-xs">Reference: {digest}</span>
  );
}

interface ErrorCopy {
  title: string;
  description?: ReactNode;
}

// While the probe runs a neutral line shows, so the generic copy never flashes before "unavailable".
export function useErrorCopy(
  error: SegmentErrorProps['error'],
  generic: string,
): ErrorCopy {
  const copy: Record<ApiHealth, ErrorCopy> = {
    checking: { title: 'Checking the connection…' },
    down: SERVICE_UNAVAILABLE,
    up: {
      title: 'Something went wrong',
      description: (
        <>
          {generic}
          <ErrorReference digest={error.digest} />
        </>
      ),
    },
  };
  return copy[useApiHealth()];
}

export function SegmentError({ error, retry }: SegmentErrorProps) {
  useLoggedError(error);
  const { title, description } = useErrorCopy(
    error,
    "This page couldn't be loaded. Nothing was changed.",
  );

  return (
    <ErrorState
      title={title}
      description={description}
      actions={
        <>
          <Button variant="strong" onClick={() => retry()}>
            Try again
          </Button>
          <Button asChild variant="link">
            <Link href={ROUTES.home}>Go to your dashboard</Link>
          </Button>
        </>
      }
    />
  );
}
