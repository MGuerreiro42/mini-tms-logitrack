'use client';

import Link from 'next/link';
import { CenteredPage } from '@/components/common/centered-page';
import { PublicCard } from '@/components/common/public-card';
import { Button } from '@/components/ui/button';

export default function RootError({
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
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
