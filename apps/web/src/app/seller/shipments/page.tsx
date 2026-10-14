import Link from 'next/link';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { ShipmentsTable } from '@/features/shipments/components/shipments-table';

export default function SellerShipmentsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Shipments"
        description="All the shipments you've created."
        action={
          <Button asChild>
            <Link href="/seller/shipments/new">Create shipment</Link>
          </Button>
        }
      />
      <ShipmentsTable />
    </div>
  );
}
