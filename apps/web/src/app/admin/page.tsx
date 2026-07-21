import { AdminDashboard } from '@/features/admin/components/admin-dashboard';

export default function AdminDashboardPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Platform overview, with a shortcut to whatever needs approval.
        </p>
      </div>
      <AdminDashboard />
    </div>
  );
}
