import { PageHeader } from '@/components/common/page-header';
import { CarrierQueueTable } from '@/features/shipments/components/carrier-queue-table';

export default function CarrierQueuePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Shipment queue"
        description="Shared across the whole company — claim an unowned shipment to work on it."
      />
      <CarrierQueueTable />
    </div>
  );
}
