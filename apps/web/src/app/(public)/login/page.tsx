import type { Metadata } from 'next';
import { PublicPage } from '@/components/common/public-page';
import { TextLink } from '@/components/common/text-link';
import { LoginForm } from '@/features/auth/components/login-form';
import { ROUTES } from '@/lib/routes';
import { SESSION_EXPIRED_PARAM } from '@/lib/session';

export const metadata: Metadata = { title: 'Sign in · Mini TMS' };

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
            <TextLink href={ROUTES.sellerSignup}>
              Create a seller account
            </TextLink>{' '}
            or{' '}
            <TextLink href={ROUTES.carrierSignup}>register a carrier</TextLink>.
          </p>
          <TextLink href={ROUTES.track}>
            Track a shipment without signing in
          </TextLink>
        </>
      }
    >
      <LoginForm />
    </PublicPage>
  );
}
