import { SellersTable } from '@/features/sellers/components/sellers-table';

export default function AdminSellersPage() {
  return (
    <div className="space-y-1">
      <h1 className="text-xl font-semibold">Sellers</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        Review seller applications and manage approved accounts.
      </p>
      <SellersTable />
    </div>
  );
}
