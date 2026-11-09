import type { Metadata } from 'next';
import { PublicPage } from '@/components/common/public-page';
import { TextLink } from '@/components/common/text-link';
import { LoginForm } from '@/features/auth/components/login-form';
import { DEMO_LOGIN_ENABLED } from '@/features/auth/lib/demo-accounts';
import { ROUTES } from '@/lib/routes';
import { NEXT_PARAM, SESSION_EXPIRED_PARAM } from '@/lib/session';

export const metadata: Metadata = { title: 'Sign in · Mini TMS' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const expired = SESSION_EXPIRED_PARAM in params;
  const next = params[NEXT_PARAM];

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
      <LoginForm
        showDemoAccounts={DEMO_LOGIN_ENABLED}
        next={typeof next === 'string' ? next : undefined}
      />
    </PublicPage>
  );
}
