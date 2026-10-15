import { listCarriers } from '@/features/carriers/api';
import { listSellers } from '@/features/sellers/api';
import { AdminMonitoringTable } from '@/features/shipments/components/admin-monitoring-table';
import { fetchAllPages } from '@/lib/fetch-all-pages';
import { requireRole, withAuthRedirects } from '@/lib/server-session';

function toOptions(rows: { id: string; companyName: string }[]) {
  return rows.map((row) => ({ value: row.id, label: row.companyName }));
}

export default async function AdminMonitoringPage() {
  const { token } = await requireRole('ADMIN');
  const [carriers, sellers] = await withAuthRedirects(
    Promise.all([
      fetchAllPages((page) => listCarriers(page, token)),
      fetchAllPages((page) => listSellers(page, token)),
    ]),
  );

  return (
    <div className="space-y-1">
      <h1 className="text-xl font-semibold">Global monitoring</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        Every shipment on the platform, updated live as any carrier advances
        one.
      </p>
      <AdminMonitoringTable
        carrierOptions={toOptions(carriers)}
        sellerOptions={toOptions(sellers)}
      />
    </div>
  );
}
