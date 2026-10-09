'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { FormError } from '@/components/common/form-error';
import { FormField } from '@/components/common/form-field';
import { Button } from '@/components/ui/button';
import { useLoginMutation } from '../hooks/use-login';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });
  const loginMutation = useLoginMutation();

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
    </form>
  );
}
