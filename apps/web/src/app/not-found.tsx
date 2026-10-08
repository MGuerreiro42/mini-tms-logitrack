import Link from 'next/link';
import { CenteredPage, MessageCard } from '@/components/common/message-card';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <CenteredPage>
      <MessageCard
        title="Page not found"
        description="The page you're looking for doesn't exist or was moved."
      >
        <Button asChild>
          <Link href="/">Go home</Link>
        </Button>
      </MessageCard>
    </CenteredPage>
  );
}
