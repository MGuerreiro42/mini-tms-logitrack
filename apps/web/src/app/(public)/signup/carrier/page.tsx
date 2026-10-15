import type { Metadata } from 'next';
import { PublicPage } from '@/components/common/public-page';
import { TextLink } from '@/components/common/text-link';
import { CarrierSignupForm } from '@/features/carriers/components/carrier-signup-form';
import { ROUTES } from '@/lib/routes';

export const metadata: Metadata = { title: 'Register your carrier · Mini TMS' };

export default function CarrierSignupPage() {
  return (
    <PublicPage
      title="Register your carrier"
      description="An administrator reviews your company before you can start operating."
      footer={
        <p>
          Already have an account?{' '}
          <TextLink href={ROUTES.login}>Sign in</TextLink>
        </p>
      }
    >
      <CarrierSignupForm />
    </PublicPage>
  );
}
