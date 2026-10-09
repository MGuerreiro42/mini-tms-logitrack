import { listCarriers } from '@/features/carriers/api';
import { listSellers } from '@/features/sellers/api';
import { AdminMonitoringTable } from '@/features/shipments/components/admin-monitoring-table';
import { getServerSession } from '@/lib/server-session';

const FILTER_OPTIONS_LIMIT = 100;

function toOptions(rows: { id: string; companyName: string }[]) {
  return rows.map((row) => ({ value: row.id, label: row.companyName }));
}

export default async function AdminMonitoringPage() {
  const token = (await getServerSession())?.token ?? '';
  const page = { page: 1, limit: FILTER_OPTIONS_LIMIT };
  const [carriers, sellers] = await Promise.all([
    listCarriers(page, token),
    listSellers(page, token),
  ]);

  return (
    <div className="space-y-1">
      <h1 className="text-xl font-semibold">Global monitoring</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        Every shipment on the platform, updated live as any carrier advances
        one.
      </p>
      <AdminMonitoringTable
        carrierOptions={toOptions(carriers.data)}
        sellerOptions={toOptions(sellers.data)}
      />
    </div>
  );
}
