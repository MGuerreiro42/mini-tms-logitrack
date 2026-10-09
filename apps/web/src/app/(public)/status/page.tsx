import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PublicCard } from '@/components/common/public-card';
import { getMyCarrier } from '@/features/carriers/api';
import { getMySeller } from '@/features/sellers/api';
import { getServerSession } from '@/lib/server-session';
import { ApiError } from '@/services/api-client';

const MESSAGES = {
  PENDING: {
    title: 'Application under review',
    body: 'Your account is still pending review by an administrator. Check back later, or sign in again to see if anything changed.',
  },
  REJECTED: {
    title: 'Application not approved',
    body: 'Your application was reviewed and was not approved. If you believe this is a mistake, contact support.',
  },
} as const;

export default async function StatusPage() {
  const session = await getServerSession();

  // A fresh signup has no token yet, so the status is PENDING by construction.
  if (!session) {
    return (
      <StatusCard
        title="Application submitted"
        body="Your application has been submitted and is pending review. You'll be able to sign in once an administrator reviews it."
      />
    );
  }

  const isCarrier =
    session.role === 'CARRIER_MANAGER' || session.role === 'CARRIER_OPERATOR';

  let status: string;
  try {
    const record = isCarrier
      ? await getMyCarrier(session.token)
      : await getMySeller(session.token);
    status = record.status;
  } catch (error) {
    if (error instanceof ApiError) {
      redirect('/login');
    }
    throw error;
  }

  if (status === 'APPROVED') {
    redirect(isCarrier ? '/carrier' : '/seller');
  }

  const message =
    MESSAGES[status as 'PENDING' | 'REJECTED'] ?? MESSAGES.PENDING;
  return <StatusCard title={message.title} body={message.body} />;
}

function StatusCard({ title, body }: { title: string; body: string }) {
  return (
    <PublicCard
      badge={
        <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-amber-100 text-2xl">
          ⏳
        </div>
      }
      title={title}
      description={body}
      actions={
        <Link href="/login" className="text-sm text-primary hover:underline">
          Back to login
        </Link>
      }
    />
  );
}
