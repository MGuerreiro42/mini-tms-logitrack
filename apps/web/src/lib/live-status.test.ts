import { fallbackPollInterval } from './live-status';

describe('fallbackPollInterval', () => {
  it('stops polling while live', () => {
    expect(fallbackPollInterval('live')).toBe(false);
  });

  it.each(['connecting', 'offline'] as const)('polls while %s', (status) => {
    expect(fallbackPollInterval(status)).toBe(5000);
  });
});
