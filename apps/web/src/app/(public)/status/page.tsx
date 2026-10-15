import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { PublicCard } from '@/components/common/public-card';
import { SignOutButton } from '@/components/common/sign-out-button';
import { getMyCarrier } from '@/features/carriers/api';
import { getMySeller } from '@/features/sellers/api';
import { ROUTES } from '@/lib/routes';
import { getServerSession, withAuthRedirects } from '@/lib/server-session';
import { isCarrierRole, ROLE_HOME } from '@/lib/session';

const MESSAGES = {
  PENDING: {
    title: 'Application under review',
    body: 'Your account is still pending review by an administrator. Check back later to see if anything changed.',
  },
  REJECTED: {
    title: 'Application not approved',
    body: 'Your application was reviewed and was not approved. If you believe this is a mistake, contact support.',
  },
} as const;

export default async function StatusPage() {
  const session = await getServerSession();

  if (!session) {
    return (
      <StatusCard
        title="Application submitted"
        body="Your application has been submitted and is pending review. You'll be able to sign in once an administrator reviews it."
        action={
          <Link
            href={ROUTES.login}
            className="text-sm text-primary hover:underline"
          >
            Back to login
          </Link>
        }
      />
    );
  }

  const { status } = await withAuthRedirects(
    isCarrierRole(session.role)
      ? getMyCarrier(session.token)
      : getMySeller(session.token),
  );

  if (status === 'APPROVED') {
    redirect(ROLE_HOME[session.role]);
  }

  const message = status === 'REJECTED' ? MESSAGES.REJECTED : MESSAGES.PENDING;
  return (
    <StatusCard
      title={message.title}
      body={message.body}
      action={<SignOutButton>Sign out</SignOutButton>}
    />
  );
}

function StatusCard({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action: ReactNode;
}) {
  return (
    <PublicCard
      badge={
        <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-amber-100 text-2xl">
          ⏳
        </div>
      }
      title={title}
      description={body}
      actions={action}
    />
  );
}
