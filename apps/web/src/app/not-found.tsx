import Link from 'next/link';
import { CenteredPage } from '@/components/common/centered-page';
import { PublicCard } from '@/components/common/public-card';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <CenteredPage>
      <PublicCard
        badge={false}
        title="Page not found"
        description="The page you're looking for doesn't exist or was moved."
        actions={
          <Button asChild>
            <Link href="/">Go home</Link>
          </Button>
        }
      />
    </CenteredPage>
  );
}
