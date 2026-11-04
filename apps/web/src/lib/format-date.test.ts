import {
  formatDate,
  formatDateTime,
  formatShortDateTime,
  formatTimeAgo,
} from './format-date';

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

  it.each(['UTC', 'Asia/Tokyo', 'America/Los_Angeles'])(
    'renders the same text when the runtime zone is %s',
    (zone) => {
      vi.stubEnv('TZ', zone);
      try {
        expect(formatDateTime(INSTANT)).toBe('Jan 14, 2026, 23:30 GMT-3');
      } finally {
        vi.unstubAllEnvs();
      }
    },
  );
});

describe('formatTimeAgo', () => {
  const now = new Date(INSTANT);
  const ago = (ms: number) => new Date(now.getTime() - ms).toISOString();

  it.each([
    [30_000, 'just now'],
    [5 * 60_000, '5 min ago'],
    [150 * 60_000, '2.5 h ago'],
  ])('describes %i ms ago as "%s"', (ms, text) => {
    expect(formatTimeAgo(ago(ms), now)).toBe(text);
  });

  it('falls back to the date after a day', () => {
    expect(formatTimeAgo(ago(30 * 3_600_000), now)).toBe('Jan 13, 17:30');
  });
});
