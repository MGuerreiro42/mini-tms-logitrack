import type { Metadata } from 'next';
import { PublicPage } from '@/components/common/public-page';
import { TextLink } from '@/components/common/text-link';
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
          <TextLink href={ROUTES.login}>Sign in</TextLink>
        </p>
      }
    >
      <SellerSignupForm />
    </PublicPage>
  );
}
