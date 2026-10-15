import type { Metadata } from 'next';
import { PublicLink, PublicPage } from '@/components/common/public-page';
import { SellerSignupForm } from '@/features/sellers/components/seller-signup-form';
import { ROUTES } from '@/lib/routes';

export const metadata: Metadata = {
  title: 'Create a seller account · Mini TMS',
};

export default function SellerSignupPage() {
  return (
    <PublicPage
      title="Create a seller account"
      description="An administrator reviews new accounts before they go live."
      footer={
        <p>
          Already have an account?{' '}
          <PublicLink href={ROUTES.login}>Sign in</PublicLink>
        </p>
      }
    >
      <SellerSignupForm />
    </PublicPage>
  );
}
