import { cookies } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getMyCarrier } from '@/features/carriers/api';
import { getMySeller } from '@/features/sellers/api';
import { parseSessionCookie, SESSION_COOKIE } from '@/lib/session';
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
  const cookieStore = await cookies();
  const session = parseSessionCookie(cookieStore.get(SESSION_COOKIE)?.value);

  // No session: a fresh signup has no token yet (signup endpoints return no
  // accessToken) — status is PENDING by construction, nothing to fetch.
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

  // Already approved: this page is stale for them, send them where they
  // actually belong instead of showing a misleading "pending" message.
  if (status === 'APPROVED') {
    redirect(isCarrier ? '/carrier' : '/seller');
  }

  const message =
    MESSAGES[status as 'PENDING' | 'REJECTED'] ?? MESSAGES.PENDING;
  return <StatusCard title={message.title} body={message.body} />;
}

function StatusCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="w-full max-w-sm space-y-4 rounded-xl border bg-card p-8 text-center shadow-sm">
      <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-amber-100 text-2xl">
        ⏳
      </div>
      <h1 className="text-lg font-semibold">{title}</h1>
      <p className="text-sm text-muted-foreground">{body}</p>
      <Link
        href="/login"
        className="inline-block text-sm text-primary hover:underline"
      >
        Back to login
      </Link>
    </div>
  );
}
