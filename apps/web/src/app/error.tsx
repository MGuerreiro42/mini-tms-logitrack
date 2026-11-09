'use client';

import Link from 'next/link';
import { NoticePage } from '@/components/common/notice-page';
import {
  type SegmentErrorProps,
  useErrorCopy,
} from '@/components/common/segment-error';
import { Button } from '@/components/ui/button';
import { useLoggedError } from '@/hooks/use-logged-error';
import { ROUTES } from '@/lib/routes';

export default function RootError({ error, retry }: SegmentErrorProps) {
  useLoggedError(error);
  const { title, description } = useErrorCopy(
    error,
    'This page stopped on an unexpected error. Try again or head back home.',
  );

  return (
    <NoticePage
      title={title}
      description={description}
      actions={
        <>
          <Button variant="strong" onClick={() => retry()}>
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
