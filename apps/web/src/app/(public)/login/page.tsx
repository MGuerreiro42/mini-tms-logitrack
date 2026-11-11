import type { Metadata } from 'next';
import { PublicPage } from '@/components/common/public-page';
import { TextLink } from '@/components/common/text-link';
import { DemoPicker } from '@/features/auth/components/demo-picker';
import { LoginForm } from '@/features/auth/components/login-form';
import { DEMO_LOGIN_ENABLED } from '@/lib/demo';
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
  const next =
    typeof params[NEXT_PARAM] === 'string' ? params[NEXT_PARAM] : undefined;

  return (
    <PublicPage
      aside={DEMO_LOGIN_ENABLED ? <DemoPicker next={next} /> : undefined}
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
      <LoginForm next={next} />
    </PublicPage>
  );
}
