import { PageHeader } from '@/components/common/page-header';
import { AdminDashboard } from '@/features/admin/components/admin-dashboard';

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Platform overview, with a shortcut to whatever needs approval."
      />
      <AdminDashboard />
    </div>
  );
}
