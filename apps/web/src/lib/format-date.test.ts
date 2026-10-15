import { formatDate, formatDateTime, formatShortDateTime } from './format-date';

const INSTANT = '2026-01-15T02:30:00.000Z';

describe('formatDate', () => {
  it('formats the calendar day in the fixed app time zone', () => {
    expect(formatDate(INSTANT)).toBe('Jan 14, 2026');
  });
});

describe('formatDateTime', () => {
  it('formats a 24h time with the zone offset', () => {
    expect(formatDateTime(INSTANT)).toBe('Jan 14, 2026, 23:30 GMT-3');
  });

  it('renders midnight as 00, not 24', () => {
    expect(formatDateTime('2026-06-01T03:05:00.000Z')).toBe(
      'Jun 1, 2026, 00:05 GMT-3',
    );
  });

  it('has a short form without year or zone', () => {
    expect(formatShortDateTime(INSTANT)).toBe('Jan 14, 23:30');
  });

  it.each([
    'UTC',
    'Asia/Tokyo',
    'America/Los_Angeles',
  ])('renders the same text when the runtime zone is %s', (zone) => {
    vi.stubEnv('TZ', zone);
    try {
      expect(formatDateTime(INSTANT)).toBe('Jan 14, 2026, 23:30 GMT-3');
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
