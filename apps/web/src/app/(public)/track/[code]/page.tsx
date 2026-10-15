import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { cache } from 'react';
import { PublicPage } from '@/components/common/public-page';
import { Button } from '@/components/ui/button';
import { getPublicTracking } from '@/features/tracking/api';
import { PublicTrackingDetails } from '@/features/tracking/components/public-tracking-details';
import { trackingTitle } from '@/features/tracking/lib/tracking-title';
import { HTTP_STATUS } from '@/lib/http-status';
import { publicTrackingPath } from '@/lib/public-tracking-path';
import { SHIPMENT_STATUS } from '@/lib/status-colors';
import { visitorAddressHeaders } from '@/lib/visitor-address';
import { ApiError } from '@/services/api-client';

interface TrackingPageProps {
  params: Promise<{ code: string }>;
}

const EXPECTED_FAILURES: number[] = [
  HTTP_STATUS.NOT_FOUND,
  HTTP_STATUS.TOO_MANY_REQUESTS,
];

const findTracking = cache(async (code: string) => {
  try {
    return await getPublicTracking(code, {
      headers: await visitorAddressHeaders(),
    });
  } catch (error) {
    if (
      error instanceof ApiError &&
      EXPECTED_FAILURES.includes(error.statusCode)
    ) {
      return error;
    }
    throw error;
  }
});

export async function generateMetadata({
  params,
}: TrackingPageProps): Promise<Metadata> {
  const { code } = await params;
  const tracking = await findTracking(code.toUpperCase());
  if (tracking instanceof ApiError) {
    return {
      title:
        tracking.statusCode === HTTP_STATUS.NOT_FOUND
          ? 'Shipment not found · Mini TMS'
          : 'Too many requests · Mini TMS',
    };
  }

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
  if (tracking instanceof ApiError) {
    if (tracking.statusCode === HTTP_STATUS.NOT_FOUND) notFound();
    return <RateLimited code={canonicalCode} />;
  }

  return (
    <PublicPage layout="single">
      <PublicTrackingDetails initialData={tracking} />
    </PublicPage>
  );
}

function RateLimited({ code }: { code: string }) {
  return (
    <PublicPage
      layout="single"
      title="Too many requests"
      description="You've looked up shipments too often in the last minute. Try again shortly."
    >
      <Button asChild>
        <Link href={publicTrackingPath(code)} prefetch={false}>
          Try again
        </Link>
      </Button>
    </PublicPage>
  );
}
