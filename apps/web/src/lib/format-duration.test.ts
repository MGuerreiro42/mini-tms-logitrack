import { formatDuration } from './format-duration';

describe('formatDuration', () => {
  it.each([
    [0, '< 1 min'],
    [0.005, '< 1 min'],
    [0.2, '12 min'],
    [59 / 60, '59 min'],
    [1, '1 h'],
    [3.46, '3.5 h'],
    [23.9, '23.9 h'],
    [24, '1 d'],
    [60, '2.5 d'],
  ])('formats %s hours as %s', (hours, expected) => {
    expect(formatDuration(hours)).toBe(expected);
  });
});
