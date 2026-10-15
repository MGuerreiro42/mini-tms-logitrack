import { ApiError } from '@/services/api-client';
import { fallbackPollInterval } from './live-status';

const healthy = { state: { error: null } };

describe('fallbackPollInterval', () => {
  it('stops polling while live', () => {
    expect(fallbackPollInterval('live')(healthy)).toBe(false);
  });

  it.each(['connecting', 'offline'] as const)('polls while %s', (status) => {
    expect(fallbackPollInterval(status)(healthy)).toBe(5000);
  });

  it.each([
    404, 403, 429,
  ])('stops polling a query that failed with a %i', (statusCode) => {
    const failed = { state: { error: new ApiError(statusCode, 'nope') } };

    expect(fallbackPollInterval('offline')(failed)).toBe(false);
  });

  it('keeps polling through server and network errors', () => {
    expect(
      fallbackPollInterval('offline')({
        state: { error: new ApiError(503, 'down') },
      }),
    ).toBe(5000);
    expect(
      fallbackPollInterval('offline')({
        state: { error: new TypeError('Failed to fetch') },
      }),
    ).toBe(5000);
  });
});
