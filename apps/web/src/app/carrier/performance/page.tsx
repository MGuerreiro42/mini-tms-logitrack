import { PageHeader } from '@/components/common/page-header';
import { WindowSelector } from '@/components/common/window-selector';
import { CarrierPerformance } from '@/features/carriers/components/carrier-performance';

export default function CarrierPerformancePage() {
  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Performance"
        description="How your company's shipments are performing."
        action={<WindowSelector />}
      />
      <CarrierPerformance />
    </div>
  );
}
