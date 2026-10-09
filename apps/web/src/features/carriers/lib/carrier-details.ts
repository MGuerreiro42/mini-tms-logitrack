import type { CompanyDetail } from '@/components/common/company-cards';
import type { Carrier } from '../types';

export function carrierDetails(
  carrier: Carrier,
  formatCreated: (iso: string) => string,
): CompanyDetail[] {
  return [
    { label: 'Manager email', value: carrier.email },
    { label: 'Tax ID', value: carrier.document, mono: true },
    { label: 'Users', value: String(carrier.userCount) },
    { label: 'Created', value: formatCreated(carrier.createdAt) },
  ];
}
