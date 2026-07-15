import { PublicTrackingForm } from '@/features/tracking/components/public-tracking-form';

export default function PublicTrackingPage() {
  return (
    <div className="w-full max-w-sm space-y-6 rounded-xl border bg-card p-8 shadow-sm">
      <div className="space-y-1 text-center">
        <div className="mx-auto mb-2 flex size-10 items-center justify-center rounded-lg bg-primary font-mono text-sm font-semibold text-primary-foreground">
          TMS
        </div>
        <h1 className="text-lg font-semibold">Track a shipment</h1>
        <p className="text-sm text-muted-foreground">
          No login needed — search by tracking code.
        </p>
      </div>
      <PublicTrackingForm />
    </div>
  );
}
