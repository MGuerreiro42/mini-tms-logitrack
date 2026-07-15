import { SellersTable } from '@/features/sellers/components/sellers-table';

export default function AdminSellersPage() {
  return (
    <div className="space-y-1">
      <h1 className="text-xl font-semibold">Sellers</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        The pending queue is the default view, since it's the recurring admin
        action.
      </p>
      <SellersTable />
    </div>
  );
}
