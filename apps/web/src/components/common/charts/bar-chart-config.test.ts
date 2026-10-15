import {
  ACCENT_FILL,
  barFills,
  buildBarChartConfig,
  SOFT_FILL,
} from './bar-chart-config';

describe('buildBarChartConfig', () => {
  it('colors the value key with the accent', () => {
    expect(buildBarChartConfig('rate', 'Rate')).toEqual({
      rate: { label: 'Rate', color: ACCENT_FILL },
    });
  });
});

describe('barFills', () => {
  it('fills every bar with the accent', () => {
    expect(barFills([1, 2], 'all')).toEqual([ACCENT_FILL, ACCENT_FILL]);
  });

  it('emphasizes only the largest value, regardless of position', () => {
    expect(barFills([3, 9, 5], 'max')).toEqual([
      SOFT_FILL,
      ACCENT_FILL,
      SOFT_FILL,
    ]);
  });
});
