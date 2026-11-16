'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { FormError } from '@/components/common/form-error';
import { FormField } from '@/components/common/form-field';
import { Button } from '@/components/ui/button';
import {
  formatCnpj,
  formatTaxId,
  isCnpj,
  isCpf,
  toDigits,
  withMask,
} from '@/lib/br-documents';

const TAX_IDS = {
  cpfOrCnpj: {
    format: formatTaxId,
    isValid: (value: string) => isCpf(value) || isCnpj(value),
    message: 'Enter a valid CPF or CNPJ',
  },
  cnpj: { format: formatCnpj, isValid: isCnpj, message: 'Enter a valid CNPJ' },
};

type TaxIdKind = keyof typeof TAX_IDS;

function schemaFor(taxId: TaxIdKind) {
  return z.object({
    companyName: z.string().min(1, 'Required'),
    document: z
      .string()
      .min(1, 'Required')
      .refine(TAX_IDS[taxId].isValid, TAX_IDS[taxId].message),
    email: z.string().email('Enter a valid email'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
  });
}

export type CompanySignupValues = z.infer<ReturnType<typeof schemaFor>>;

interface CompanySignupFormProps {
  taxId: TaxIdKind;
  labels: { companyName: string; document: string; email: string };
  submitLabel: string;
  signup: {
    mutate: (values: CompanySignupValues) => void;
    isPending: boolean;
    error: unknown;
  };
}

export function CompanySignupForm({
  taxId,
  labels,
  submitLabel,
  signup,
}: CompanySignupFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CompanySignupValues>({ resolver: zodResolver(schemaFor(taxId)) });

  return (
    <form
      className="space-y-4"
      noValidate
      onSubmit={handleSubmit((values) =>
        signup.mutate({ ...values, document: toDigits(values.document) }),
      )}
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
        inputMode="numeric"
        error={errors.document?.message}
        {...withMask(register('document'), TAX_IDS[taxId].format)}
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
