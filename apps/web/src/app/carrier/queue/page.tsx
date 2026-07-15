import { CarrierQueueTable } from '@/features/shipments/components/carrier-queue-table';

export default function CarrierQueuePage() {
  return (
    <div className="space-y-1">
      <h1 className="text-xl font-semibold">Shipment queue</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        Shared across the whole company — claim an unowned shipment to work on
        it.
      </p>
      <CarrierQueueTable />
    </div>
  );
}
