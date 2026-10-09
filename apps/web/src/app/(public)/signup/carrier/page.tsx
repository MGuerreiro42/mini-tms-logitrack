import Link from 'next/link';
import { PublicCard } from '@/components/common/public-card';
import { CarrierSignupForm } from '@/features/carriers/components/carrier-signup-form';

export default function CarrierSignupPage() {
  return (
    <PublicCard
      badge={false}
      align="start"
      title="Carrier company registration"
      description="An administrator reviews your company before you can start operating."
    >
      <CarrierSignupForm />
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/login" className="text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </PublicCard>
  );
}
