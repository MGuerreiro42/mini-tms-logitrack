'use client';

import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useLoggedError } from '@/hooks/use-logged-error';

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
    <Alert variant="destructive">
      <AlertTitle>Something went wrong</AlertTitle>
      <AlertDescription>
        This page couldn't be loaded.
        <ErrorReference digest={error.digest} />
      </AlertDescription>
      <AlertAction>
        <Button size="sm" variant="outline" onClick={() => unstable_retry()}>
          Try again
        </Button>
      </AlertAction>
    </Alert>
  );
}
