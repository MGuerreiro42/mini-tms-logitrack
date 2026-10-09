import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { PublicCard } from '@/components/common/public-card';
import { getPublicTracking } from '@/features/tracking/api';
import { PublicTrackingDetails } from '@/features/tracking/components/public-tracking-details';
import { SHIPMENT_STATUS } from '@/lib/status-colors';
import { ApiError } from '@/services/api-client';

interface TrackingPageProps {
  params: Promise<{ code: string }>;
}

const findTracking = cache(async (code: string) => {
  try {
    return await getPublicTracking(code);
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 404) return null;
    throw error;
  }
});

export async function generateMetadata({
  params,
}: TrackingPageProps): Promise<Metadata> {
  const { code } = await params;
  const tracking = await findTracking(code);
  if (!tracking) return { title: 'Shipment not found · Mini TMS' };

  const status = SHIPMENT_STATUS[tracking.status].label;
  return {
    title: `${tracking.trackingCode} · ${status} · Mini TMS`,
    description: `Shipment ${tracking.trackingCode} is ${status.toLowerCase()} (${tracking.addressCity}/${tracking.addressState}).`,
  };
}

export default async function TrackingPage({ params }: TrackingPageProps) {
  const { code } = await params;
  const tracking = await findTracking(code);
  if (!tracking) notFound();

  return (
    <PublicCard
      title={<span className="font-mono">{tracking.trackingCode}</span>}
      description="Shipment status"
    >
      <PublicTrackingDetails initialData={tracking} />
    </PublicCard>
  );
}
