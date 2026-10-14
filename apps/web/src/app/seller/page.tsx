import { PageHeader } from '@/components/common/page-header';
import { SellerDashboard } from '@/features/shipments/components/seller-dashboard';

export default function SellerDashboardPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" description="Overview of your shipments." />
      <SellerDashboard />
    </div>
  );
}
