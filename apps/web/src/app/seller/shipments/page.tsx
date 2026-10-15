import { ShipmentsTable } from '@/features/shipments/components/shipments-table';

export default function SellerShipmentsPage() {
  return (
    <div className="space-y-1">
      <h1 className="text-xl font-semibold">Shipments</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        All the shipments you've created.
      </p>
      <ShipmentsTable />
    </div>
  );
}
