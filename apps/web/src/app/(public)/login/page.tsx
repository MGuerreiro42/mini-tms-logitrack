import Link from 'next/link';
import { LoginForm } from '@/features/auth/components/login-form';

export default function LoginPage() {
  return (
    <div className="w-full max-w-sm space-y-6 rounded-xl border bg-card p-8 shadow-sm">
      <div className="space-y-1 text-center">
        <div className="mx-auto mb-2 flex size-10 items-center justify-center rounded-lg bg-primary font-mono text-sm font-semibold text-primary-foreground">
          TMS
        </div>
        <h1 className="text-lg font-semibold">Sign in to Mini TMS</h1>
        <p className="text-sm text-muted-foreground">
          Redirects based on your account role.
        </p>
      </div>
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
    </div>
  );
}
