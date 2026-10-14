'use client';

import Link from 'next/link';
import { ErrorState } from '@/components/common/feedback-state';
import { Button } from '@/components/ui/button';
import { useLoggedError } from '@/hooks/use-logged-error';
import { ROUTES } from '@/lib/routes';

export interface SegmentErrorProps {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}

export function ErrorReference({ digest }: { digest?: string }) {
  if (!digest) return null;

  return (
    <span className="mt-1 block font-mono text-xs">Reference: {digest}</span>
  );
}

export function SegmentError({ error, unstable_retry }: SegmentErrorProps) {
  useLoggedError(error);

  return (
    <ErrorState
      title="Something went wrong"
      description={
        <>
          This page couldn't be loaded. Nothing was changed.
          <ErrorReference digest={error.digest} />
        </>
      }
      actions={
        <>
          <Button variant="strong" onClick={() => unstable_retry()}>
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
