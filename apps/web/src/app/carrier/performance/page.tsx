import { CarrierPerformance } from '@/features/carriers/components/carrier-performance';

export default function CarrierPerformancePage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Performance</h1>
        <p className="text-sm text-muted-foreground">
          How your company's shipments are performing.
        </p>
      </div>
      <CarrierPerformance />
    </div>
  );
}
