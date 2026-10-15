import type { CompanyDetail } from '@/components/common/company-cards';
import type { Seller } from '../types';

export function sellerDetails(
  seller: Seller,
  formatCreated: (iso: string) => string,
): CompanyDetail[] {
  return [
    { label: 'Email', value: seller.email },
    { label: 'Tax ID', value: seller.document, mono: true },
    { label: 'Created', value: formatCreated(seller.createdAt) },
  ];
}
