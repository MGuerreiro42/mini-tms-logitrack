'use client';

import Link from 'next/link';
import { CenteredPage } from '@/components/common/centered-page';
import { PublicCard } from '@/components/common/public-card';
import type { SegmentErrorProps } from '@/components/common/segment-error';
import { Button } from '@/components/ui/button';

export default function RootError({ unstable_retry }: SegmentErrorProps) {
  return (
    <CenteredPage>
      <PublicCard
        badge={false}
        title="Something went wrong"
        description="An unexpected error occurred. Try again, or head back home."
        actions={
          <>
            <Button onClick={() => unstable_retry()}>Try again</Button>
            <Button asChild variant="outline">
              <Link href="/">Go home</Link>
            </Button>
          </>
        }
      />
    </CenteredPage>
  );
}
