import Link from 'next/link';
import { PublicCard } from '@/components/common/public-card';
import { Button } from '@/components/ui/button';

export default function TrackingNotFound() {
  return (
    <PublicCard
      badge={false}
      title="Shipment not found"
      description="We couldn't find a shipment with this tracking code. Check the code and try again."
      actions={
        <>
          <Button asChild>
            <Link href="/track">Search again</Link>
          </Button>
        </>
      }
    />
  );
}
