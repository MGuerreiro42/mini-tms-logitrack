'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { ErrorState } from '@/components/common/feedback-state';
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
  title?: string;
  description?: ReactNode;
}

// While the probe runs neither message shows, so the generic one never flashes before "unavailable".
export function useErrorCopy(
  error: SegmentErrorProps['error'],
  generic: string,
): ErrorCopy {
  useLoggedError(error);
  const copy: Record<ApiHealth, ErrorCopy> = {
    checking: {},
    down: {
      title: "We can't reach the Mini TMS service right now",
      description: 'Your data is safe; try again in a moment.',
    },
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
