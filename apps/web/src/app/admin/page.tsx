import { AdminDashboard } from '@/features/admin/components/admin-dashboard';
import { getAdminShipmentStatusCounts } from '@/features/shipments/api';
import { requireSegment, withAuthRedirects } from '@/lib/server-session';

export default async function AdminDashboardPage() {
  const { token } = await requireSegment('admin');
  const shipmentCounts = await withAuthRedirects(
    getAdminShipmentStatusCounts({}, token),
  );

  return <AdminDashboard shipmentCounts={shipmentCounts} />;
}
