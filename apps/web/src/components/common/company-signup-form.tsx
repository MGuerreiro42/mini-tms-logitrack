'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { FormError } from '@/components/common/form-error';
import { FormField } from '@/components/common/form-field';
import { Button } from '@/components/ui/button';

const schema = z.object({
  companyName: z.string().min(1, 'Required'),
  document: z.string().min(1, 'Required'),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export type CompanySignupValues = z.infer<typeof schema>;

interface CompanySignupFormProps {
  labels: { companyName: string; document: string; email: string };
  submitLabel: string;
  signup: {
    mutate: (values: CompanySignupValues) => void;
    isPending: boolean;
    error: unknown;
  };
}

export function CompanySignupForm({
  labels,
  submitLabel,
  signup,
}: CompanySignupFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CompanySignupValues>({ resolver: zodResolver(schema) });

  return (
    <form
      className="space-y-4"
      noValidate
      onSubmit={handleSubmit((values) => signup.mutate(values))}
    >
      <FormField
        id="companyName"
        label={labels.companyName}
        error={errors.companyName?.message}
        {...register('companyName')}
      />
      <FormField
        id="document"
        label={labels.document}
        error={errors.document?.message}
        {...register('document')}
      />
      <FormField
        id="email"
        type="email"
        label={labels.email}
        error={errors.email?.message}
        {...register('email')}
      />
      <FormField
        id="password"
        type="password"
        label="Password"
        error={errors.password?.message}
        {...register('password')}
      />
      <FormError error={signup.error} />
      <Button type="submit" className="w-full" disabled={signup.isPending}>
        {signup.isPending ? 'Creating account…' : submitLabel}
      </Button>
    </form>
  );
}
