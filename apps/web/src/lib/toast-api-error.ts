import { toast } from 'sonner';
import { SHIPMENT_STATUS_LABEL } from '@/lib/status-labels';
import { ApiError } from '@/services/api-client';
import type { ShipmentStatus } from '@/types/status';

const STATUS_TOKEN = new RegExp(
  `\\b(${Object.keys(SHIPMENT_STATUS_LABEL).join('|')})\\b`,
  'g',
);
const SENTENCE_START = /(^|[.!?]\s+)$/;

function humanizeStatuses(message: string): string {
  return message.replace(STATUS_TOKEN, (status, _group, offset: number) => {
    const label = SHIPMENT_STATUS_LABEL[status as ShipmentStatus];
    return SENTENCE_START.test(message.slice(0, offset))
      ? label
      : label.toLowerCase();
  });
}

export function apiErrorMessage(error: unknown): string {
  return error instanceof ApiError
    ? humanizeStatuses(error.message)
    : 'Something went wrong. Please try again.';
}

export function toastApiError(error: unknown): void {
  toast.error(apiErrorMessage(error));
}
