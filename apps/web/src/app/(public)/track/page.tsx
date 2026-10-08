import { PublicCard } from '@/components/common/public-card';
import { PublicTrackingForm } from '@/features/tracking/components/public-tracking-form';

export default function PublicTrackingPage() {
  return (
    <PublicCard
      title="Track a shipment"
      description="No login needed — search by tracking code."
    >
      <PublicTrackingForm />
    </PublicCard>
  );
}
