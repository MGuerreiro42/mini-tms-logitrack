import Link from 'next/link';
import { MessageCard } from '@/components/common/message-card';
import { Button } from '@/components/ui/button';

export default function TrackingNotFound() {
  return (
    <MessageCard
      title="Shipment not found"
      description="We couldn't find a shipment with this tracking code. Check the code and try again."
    >
      <Button asChild>
        <Link href="/track">Search again</Link>
      </Button>
    </MessageCard>
  );
}
