'use client';

import { CompanySignupForm } from '@/components/common/company-signup-form';
import { useSellerSignupMutation } from '../hooks/use-seller-signup';

const LABELS = {
  companyName: 'Company name',
  document: 'Tax ID (CNPJ/CPF)',
  email: 'Email',
};

export function SellerSignupForm() {
  return (
    <CompanySignupForm
      labels={LABELS}
      submitLabel="Create account and continue"
      signup={useSellerSignupMutation()}
    />
  );
}
