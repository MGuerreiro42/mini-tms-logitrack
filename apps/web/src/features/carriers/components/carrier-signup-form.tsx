'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiError } from '@/services/api-client';
import { useCarrierSignupMutation } from '../hooks/use-carrier-signup';

const schema = z.object({
  companyName: z.string().min(1, 'Required'),
  document: z.string().min(1, 'Required'),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type FormValues = z.infer<typeof schema>;

export function CarrierSignupForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });
  const signup = useCarrierSignupMutation();

  return (
    <form
      className="space-y-4"
      noValidate
      onSubmit={handleSubmit((values) => signup.mutate(values))}
    >
      <div className="space-y-1.5">
        <Label htmlFor="companyName">Carrier company name</Label>
        <Input id="companyName" {...register('companyName')} />
        {errors.companyName && (
          <p className="text-sm text-destructive">
            {errors.companyName.message}
          </p>
        )}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="document">Tax ID (CNPJ)</Label>
        <Input id="document" {...register('document')} />
        {errors.document && (
          <p className="text-sm text-destructive">{errors.document.message}</p>
        )}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="email">Manager email</Label>
        <Input id="email" type="email" {...register('email')} />
        {errors.email && (
          <p className="text-sm text-destructive">{errors.email.message}</p>
        )}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" {...register('password')} />
        {errors.password && (
          <p className="text-sm text-destructive">{errors.password.message}</p>
        )}
      </div>
      {signup.isError && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {signup.error instanceof ApiError
            ? signup.error.message
            : 'Something went wrong.'}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={signup.isPending}>
        {signup.isPending ? 'Creating account…' : 'Create account'}
      </Button>
    </form>
  );
}
