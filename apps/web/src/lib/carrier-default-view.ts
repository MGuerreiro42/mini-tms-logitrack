import type { GlobalRole } from '@/types/auth';

export function carrierDefaultView(role: GlobalRole | undefined) {
  return role === 'CARRIER_MANAGER' ? 'unclaimed' : 'mine';
}
