import { PageHeader } from '@/components/common/page-header';
import { SellersTable } from '@/features/sellers/components/sellers-table';

export default function AdminSellersPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Sellers"
        description="Review seller applications and manage approved accounts."
      />
      <SellersTable />
    </div>
  );
}
