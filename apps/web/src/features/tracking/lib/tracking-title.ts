import { SHIPMENT_STATUS } from '@/lib/status-colors';
import type { PublicTracking } from '../types';

export function trackingTitle({
  trackingCode,
  status,
}: Pick<PublicTracking, 'trackingCode' | 'status'>): string {
  return `${trackingCode} · ${SHIPMENT_STATUS[status].label} · Mini TMS`;
}
