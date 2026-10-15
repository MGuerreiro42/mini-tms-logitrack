import { PublicLink, PublicPage } from '@/components/common/public-page';
import { LoginForm } from '@/features/auth/components/login-form';
import { SESSION_EXPIRED_PARAM } from '@/lib/session';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const expired = SESSION_EXPIRED_PARAM in (await searchParams);

  return (
    <PublicPage
      title="Sign in"
      description={
        expired
          ? 'Your session expired. Sign in again to continue.'
          : 'Use the account your company was approved with.'
      }
      footer={
        <>
          <p>
            New here?{' '}
            <PublicLink href="/signup/seller">
              Create a seller account
            </PublicLink>{' '}
            or{' '}
            <PublicLink href="/signup/carrier">register a carrier</PublicLink>.
          </p>
          <PublicLink href="/track">
            Track a shipment without signing in
          </PublicLink>
        </>
      }
    >
      <LoginForm />
    </PublicPage>
  );
}
