import Link from 'next/link';
import { PublicCard } from '@/components/common/public-card';
import { LoginForm } from '@/features/auth/components/login-form';

export default function LoginPage() {
  return (
    <PublicCard
      title="Sign in to Mini TMS"
      description="Sign in with your company account."
    >
      <LoginForm />
      <div className="space-y-1 text-center text-sm text-muted-foreground">
        <p>
          New seller?{' '}
          <Link href="/signup/seller" className="text-primary hover:underline">
            Create an account
          </Link>
        </p>
        <p>
          New carrier?{' '}
          <Link href="/signup/carrier" className="text-primary hover:underline">
            Register your company
          </Link>
        </p>
      </div>
    </PublicCard>
  );
}
