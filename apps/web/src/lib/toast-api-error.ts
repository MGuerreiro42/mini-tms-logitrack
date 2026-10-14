import { toast } from 'sonner';
import { SHIPMENT_STATUS, SHIPMENT_STATUSES } from '@/lib/status-colors';
import { ApiError } from '@/services/api-client';
import type { ShipmentStatus } from '@/types/status';

const STATUS_TOKEN = new RegExp(`\\b(${SHIPMENT_STATUSES.join('|')})\\b`, 'g');

// API messages can embed raw status enums; the UI only ever shows their labels.
function humanizeStatuses(message: string): string {
  return message.replace(STATUS_TOKEN, (status) =>
    SHIPMENT_STATUS[status as ShipmentStatus].label.toLowerCase(),
  );
}

export function apiErrorMessage(error: unknown): string {
  return error instanceof ApiError
    ? humanizeStatuses(error.message)
    : 'Something went wrong. Please try again.';
}

export function toastApiError(error: unknown): void {
  toast.error(apiErrorMessage(error));
}
