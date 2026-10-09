import Link from 'next/link';
import { PublicCard } from '@/components/common/public-card';
import { SellerSignupForm } from '@/features/sellers/components/seller-signup-form';

export default function SellerSignupPage() {
  return (
    <PublicCard
      badge={false}
      align="start"
      title="Seller signup"
      description="An administrator reviews new accounts before they go live."
    >
      <SellerSignupForm />
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/login" className="text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </PublicCard>
  );
}
