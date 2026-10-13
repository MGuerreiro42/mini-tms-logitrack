import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { cache } from 'react';
import { PublicCard } from '@/components/common/public-card';
import { getPublicTracking } from '@/features/tracking/api';
import { PublicTrackingDetails } from '@/features/tracking/components/public-tracking-details';
import { trackingTitle } from '@/features/tracking/lib/tracking-title';
import { publicTrackingPath } from '@/lib/public-tracking-path';
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
  const tracking = await findTracking(code.toUpperCase());
  if (!tracking) return { title: 'Shipment not found · Mini TMS' };

  const status = SHIPMENT_STATUS[tracking.status].label;
  return {
    title: trackingTitle(tracking),
    description: `Shipment ${tracking.trackingCode} is ${status.toLowerCase()} (${tracking.addressCity}/${tracking.addressState}).`,
  };
}

export default async function TrackingPage({ params }: TrackingPageProps) {
  const { code } = await params;
  const canonicalCode = code.toUpperCase();
  if (code !== canonicalCode) {
    permanentRedirect(publicTrackingPath(canonicalCode));
  }

  const tracking = await findTracking(canonicalCode);
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
