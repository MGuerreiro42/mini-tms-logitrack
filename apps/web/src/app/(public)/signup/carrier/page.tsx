import Link from 'next/link';
import { CarrierSignupForm } from '@/features/carriers/components/carrier-signup-form';

export default function CarrierSignupPage() {
  return (
    <div className="w-full max-w-sm space-y-6 rounded-xl border bg-card p-8 shadow-sm">
      <div className="space-y-1">
        <h1 className="text-lg font-semibold">Carrier company registration</h1>
        <p className="text-sm text-muted-foreground">
          Creates the manager account and the company with status pending
          review.
        </p>
      </div>
      <CarrierSignupForm />
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/login" className="text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
