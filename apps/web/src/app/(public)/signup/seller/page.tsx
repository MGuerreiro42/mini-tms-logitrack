import Link from 'next/link';
import { SellerSignupForm } from '@/features/sellers/components/seller-signup-form';

export default function SellerSignupPage() {
  return (
    <div className="w-full max-w-sm space-y-6 rounded-xl border bg-card p-8 shadow-sm">
      <div className="space-y-1">
        <h1 className="text-lg font-semibold">Seller signup</h1>
        <p className="text-sm text-muted-foreground">
          Creates an account with status pending review.
        </p>
      </div>
      <SellerSignupForm />
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/login" className="text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
