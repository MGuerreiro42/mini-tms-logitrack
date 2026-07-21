import { AdminMonitoringTable } from '@/features/shipments/components/admin-monitoring-table';

export default function AdminMonitoringPage() {
  return (
    <div className="space-y-1">
      <h1 className="text-xl font-semibold">Global monitoring</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        Every shipment on the platform, updated live as any carrier advances
        one.
      </p>
      <AdminMonitoringTable />
    </div>
  );
}
