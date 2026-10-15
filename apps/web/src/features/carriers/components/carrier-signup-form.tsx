'use client';

import { CompanySignupForm } from '@/components/common/company-signup-form';
import { useCarrierSignupMutation } from '../hooks/use-carrier-signup';

const LABELS = {
  companyName: 'Carrier company name',
  document: 'Tax ID (CNPJ)',
  email: 'Manager email',
};

export function CarrierSignupForm() {
  return (
    <CompanySignupForm
      labels={LABELS}
      submitLabel="Create account"
      signup={useCarrierSignupMutation()}
    />
  );
}
