import { CarriersTable } from '@/features/carriers/components/carriers-table';

export default function AdminCarriersPage() {
  return (
    <div className="space-y-1">
      <h1 className="text-xl font-semibold">Carriers</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        Users column shows how many CarrierUser accounts belong to each company.
      </p>
      <CarriersTable />
    </div>
  );
}
