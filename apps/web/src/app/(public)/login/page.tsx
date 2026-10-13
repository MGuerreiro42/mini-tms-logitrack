import Link from 'next/link';
import { PublicCard } from '@/components/common/public-card';
import { LoginForm } from '@/features/auth/components/login-form';
import { SESSION_EXPIRED_PARAM } from '@/lib/session';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const expired = SESSION_EXPIRED_PARAM in (await searchParams);

  return (
    <PublicCard
      title="Sign in to Mini TMS"
      description={
        expired
          ? 'Your session expired. Sign in again to continue.'
          : 'Sign in with your company account.'
      }
    >
      <LoginForm />
      <div className="space-y-1 text-center text-sm text-muted-foreground">
        <p>
          New seller?{' '}
          <Link href="/signup/seller" className="text-primary hover:underline">
            Create an account
          </Link>
        </p>
        <p>
          New carrier?{' '}
          <Link href="/signup/carrier" className="text-primary hover:underline">
            Register your company
          </Link>
        </p>
      </div>
    </PublicCard>
  );
}
