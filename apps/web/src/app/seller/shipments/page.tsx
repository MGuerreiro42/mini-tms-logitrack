import { ShipmentsTable } from '@/features/shipments/components/shipments-table';

export default function SellerShipmentsPage() {
  return (
    <div className="space-y-1">
      <h1 className="text-xl font-semibold">Shipments</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        Only your own shipments — scoped server-side to the authenticated
        seller.
      </p>
      <ShipmentsTable />
    </div>
  );
}
