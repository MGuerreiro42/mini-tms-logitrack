import { toast } from 'sonner';
import { ApiError } from '@/services/api-client';

export function apiErrorMessage(error: unknown): string {
  return error instanceof ApiError
    ? error.message
    : 'Something went wrong. Please try again.';
}

export function toastApiError(error: unknown): void {
  toast.error(apiErrorMessage(error));
}
