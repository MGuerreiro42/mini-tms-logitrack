import { SellerDashboard } from '@/features/shipments/components/seller-dashboard';

export default function SellerDashboardPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Overview of your shipments.
        </p>
      </div>
      <SellerDashboard />
    </div>
  );
}
