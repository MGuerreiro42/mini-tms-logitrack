import Link from 'next/link';
import { PublicPage } from '@/components/common/public-page';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/lib/routes';

export default function TrackingNotFound() {
  return (
    <PublicPage
      layout="single"
      title="Shipment not found"
      description="We couldn't find a shipment with this tracking code. Check the code and try again."
    >
      <Button asChild>
        <Link href={ROUTES.track}>Search again</Link>
      </Button>
    </PublicPage>
  );
}
