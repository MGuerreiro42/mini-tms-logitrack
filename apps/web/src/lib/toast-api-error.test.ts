import { toast } from 'sonner';
import { ApiError } from '@/services/api-client';
import { apiErrorMessage, toastApiError } from './toast-api-error';

vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));

describe('apiErrorMessage', () => {
  it('uses the API message when there is one', () => {
    expect(apiErrorMessage(new ApiError(409, 'Already claimed'))).toBe(
      'Already claimed',
    );
  });

  it('falls back to a generic message for anything else', () => {
    expect(apiErrorMessage(new TypeError('Failed to fetch'))).toBe(
      'Something went wrong. Please try again.',
    );
  });
});

describe('toastApiError', () => {
  it('toasts the error message', () => {
    toastApiError(new ApiError(400, 'Invalid note'));
    expect(toast.error).toHaveBeenCalledWith('Invalid note');
  });
});
