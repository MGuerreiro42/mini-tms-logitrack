'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { FormError } from '@/components/common/form-error';
import { FormField } from '@/components/common/form-field';
import { Button } from '@/components/ui/button';
import { useLoginMutation } from '../hooks/use-login';
import { DEMO_ACCOUNTS } from '../lib/demo-accounts';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm({
  showDemoAccounts = false,
  next,
}: {
  showDemoAccounts?: boolean;
  next?: string;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });
  const loginMutation = useLoginMutation(next);

  return (
    <form
      className="space-y-4"
      noValidate
      onSubmit={handleSubmit((values) => loginMutation.mutate(values))}
    >
      <FormField
        id="email"
        type="email"
        label="Email"
        autoComplete="email"
        error={errors.email?.message}
        {...register('email')}
      />
      <FormField
        id="password"
        type="password"
        label="Password"
        autoComplete="current-password"
        error={errors.password?.message}
        {...register('password')}
      />
      <FormError error={loginMutation.error} />
      <Button
        type="submit"
        className="w-full"
        disabled={loginMutation.isPending}
      >
        {loginMutation.isPending ? 'Signing in…' : 'Sign in'}
      </Button>
      {showDemoAccounts && (
        <div className="flex flex-col gap-2.5 pt-1">
          <p className="text-center text-xs text-muted-foreground">
            Or try the demo as
          </p>
          <div className="grid grid-cols-3 gap-2">
            {DEMO_ACCOUNTS.map(({ label, email, password }) => (
              <Button
                key={email}
                type="button"
                variant="outline"
                size="sm"
                disabled={loginMutation.isPending}
                onClick={() => loginMutation.mutate({ email, password })}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
      )}
    </form>
  );
}
