import { CarrierPerformance } from '@/features/carriers/components/carrier-performance';

export default function CarrierPerformancePage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Performance</h1>
        <p className="text-sm text-muted-foreground">
          Metrics restricted to shipments assigned to your own company.
        </p>
      </div>
      <CarrierPerformance />
    </div>
  );
}
