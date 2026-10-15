import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PublicLink, PublicPage } from '@/components/common/public-page';
import { PublicTrackingForm } from '@/features/tracking/components/public-tracking-form';
import { publicTrackingPath } from '@/lib/public-tracking-path';
import { ROUTES } from '@/lib/routes';

export const metadata: Metadata = { title: 'Track a shipment · Mini TMS' };

export default async function PublicTrackingPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const code = (await searchParams).code?.trim();
  if (code) redirect(publicTrackingPath(code));

  return (
    <PublicPage
      title="Track a shipment"
      description="No sign-in needed. Enter the tracking code you received."
      footer={
        <p>
          Work with Mini TMS?{' '}
          <PublicLink href={ROUTES.login}>Sign in</PublicLink>
        </p>
      }
    >
      <PublicTrackingForm />
    </PublicPage>
  );
}
