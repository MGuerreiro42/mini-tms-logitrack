import Link from 'next/link';
import { PublicPage } from '@/components/common/public-page';
import { Button } from '@/components/ui/button';

export default function TrackingNotFound() {
  return (
    <PublicPage
      title="Shipment not found"
      description="We couldn't find a shipment with this tracking code. Check the code and try again."
    >
      <Button asChild>
        <Link href="/track">Search again</Link>
      </Button>
    </PublicPage>
  );
}
