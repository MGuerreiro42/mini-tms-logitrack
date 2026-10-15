import { listCarriers } from '@/features/carriers/api';
import { listSellers } from '@/features/sellers/api';
import { AdminMonitoringTable } from '@/features/shipments/components/admin-monitoring-table';
import { fetchAllPages } from '@/lib/fetch-all-pages';
import { requireSegment, withAuthRedirects } from '@/lib/server-session';

function toOptions(rows: { id: string; companyName: string }[]) {
  return rows.map((row) => ({ value: row.id, label: row.companyName }));
}

export default async function AdminMonitoringPage() {
  const { token } = await requireSegment('admin');
  const [carriers, sellers] = await withAuthRedirects(
    Promise.all([
      fetchAllPages((page) => listCarriers(page, token)),
      fetchAllPages((page) => listSellers(page, token)),
    ]),
  );

  return (
    <AdminMonitoringTable
      carrierOptions={toOptions(carriers)}
      sellerOptions={toOptions(sellers)}
    />
  );
}
