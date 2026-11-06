import type { CompanyDetail } from '@/features/companies/components/company-cards';
import { formatTaxId } from '@/lib/br-documents';
import type { Carrier } from '../types';

export function carrierDetails(
  carrier: Carrier,
  formatCreated: (iso: string) => string,
): CompanyDetail[] {
  return [
    { label: 'Manager email', value: carrier.email },
    { label: 'Tax ID', value: formatTaxId(carrier.document), mono: true },
    { label: 'Users', value: String(carrier.userCount) },
    { label: 'Created', value: formatCreated(carrier.createdAt) },
  ];
}
