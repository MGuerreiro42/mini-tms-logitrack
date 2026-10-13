import type { Metadata } from 'next';
import Link from 'next/link';
import { CenteredPage } from '@/components/common/centered-page';
import { PublicCard } from '@/components/common/public-card';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = { title: 'Access denied · Mini TMS' };

export default function ForbiddenPage() {
  return (
    <CenteredPage>
      <PublicCard
        badge={false}
        title="You don't have access to this page"
        description="Your account's role can't open this area. You're still signed in."
        actions={
          <Button asChild>
            <Link href="/">Go to your home</Link>
          </Button>
        }
      />
    </CenteredPage>
  );
}
