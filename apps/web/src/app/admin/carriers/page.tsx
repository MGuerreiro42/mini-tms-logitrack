import { PageHeader } from '@/components/common/page-header';
import { CarriersTable } from '@/features/carriers/components/carriers-table';

export default function AdminCarriersPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Carriers"
        description="Review carrier registrations and manage approved companies."
      />
      <CarriersTable />
    </div>
  );
}
