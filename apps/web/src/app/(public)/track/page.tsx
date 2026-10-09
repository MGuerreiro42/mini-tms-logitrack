import { redirect } from 'next/navigation';
import { PublicCard } from '@/components/common/public-card';
import { PublicTrackingForm } from '@/features/tracking/components/public-tracking-form';
import { publicTrackingPath } from '@/features/tracking/lib/public-tracking-path';

export default async function PublicTrackingPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const code = (await searchParams).code?.trim();
  if (code) redirect(publicTrackingPath(code));

  return (
    <PublicCard
      title="Track a shipment"
      description="No login needed — search by tracking code."
    >
      <PublicTrackingForm />
    </PublicCard>
  );
}
