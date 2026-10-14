import { PageHeader } from '@/components/common/page-header';
import { CarrierPerformance } from '@/features/carriers/components/carrier-performance';

export default function CarrierPerformancePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Performance"
        description="How your company's shipments are performing."
      />
      <CarrierPerformance />
    </div>
  );
}
