'use client';

import Link from 'next/link';
import { NoticePage } from '@/components/common/notice-page';
import {
  ErrorReference,
  type SegmentErrorProps,
} from '@/components/common/segment-error';
import { Button } from '@/components/ui/button';
import { useLoggedError } from '@/hooks/use-logged-error';
import { ROUTES } from '@/lib/routes';

export default function RootError({
  error,
  unstable_retry,
}: SegmentErrorProps) {
  useLoggedError(error);

  return (
    <NoticePage
      title="Something went wrong"
      description={
        <>
          This page stopped on an unexpected error. Try again or head back home.
          <ErrorReference digest={error.digest} />
        </>
      }
      actions={
        <>
          <Button variant="strong" onClick={() => unstable_retry()}>
            Try again
          </Button>
          <Button asChild variant="link">
            <Link href={ROUTES.home}>Go home</Link>
          </Button>
        </>
      }
    />
  );
}
