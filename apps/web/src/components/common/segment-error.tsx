'use client';

import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

export interface SegmentErrorProps {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}

// Rendered inside the role layout, so the sidebar stays usable when one page fails.
export function SegmentError({ unstable_retry }: SegmentErrorProps) {
  return (
    <Alert variant="destructive">
      <AlertTitle>Something went wrong</AlertTitle>
      <AlertDescription>This page couldn't be loaded.</AlertDescription>
      <AlertAction>
        <Button size="sm" variant="outline" onClick={() => unstable_retry()}>
          Try again
        </Button>
      </AlertAction>
    </Alert>
  );
}
