import Link from 'next/link';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { SellerDashboard } from '@/features/shipments/components/seller-dashboard';
import { ROUTES } from '@/lib/routes';

export default function SellerDashboardPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Overview"
        description="What needs you and what is moving now."
        action={
          <Button asChild>
            <Link href={ROUTES.newShipment}>Create shipment</Link>
          </Button>
        }
      />
      <SellerDashboard />
    </div>
  );
}
