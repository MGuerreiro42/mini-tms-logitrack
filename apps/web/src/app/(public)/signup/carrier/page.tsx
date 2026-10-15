import { PublicLink, PublicPage } from '@/components/common/public-page';
import { CarrierSignupForm } from '@/features/carriers/components/carrier-signup-form';
import { ROUTES } from '@/lib/routes';

export default function CarrierSignupPage() {
  return (
    <PublicPage
      title="Register a carrier"
      description="An administrator reviews your company before you can start operating."
      footer={
        <p>
          Already have an account?{' '}
          <PublicLink href={ROUTES.login}>Sign in</PublicLink>
        </p>
      }
    >
      <CarrierSignupForm />
    </PublicPage>
  );
}
