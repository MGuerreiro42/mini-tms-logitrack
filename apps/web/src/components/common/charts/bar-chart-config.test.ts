import { ordinalChartRamp } from '@/lib/ordinal-chart-ramp';
import { buildBarChartConfig, rowColorKey } from './bar-chart-config';

describe('buildBarChartConfig', () => {
  it('themes the value key with a single color', () => {
    const theme = { light: '#111', dark: '#222' };
    expect(buildBarChartConfig('rate', 'Rate', theme, 3)).toEqual({
      rate: { label: 'Rate', theme },
    });
  });

  it('gives every row its own ordinal ramp step', () => {
    const config = buildBarChartConfig('total', 'Total', 'ordinal', 3);
    const ramp = ordinalChartRamp(3);

    expect(config.total).toEqual({ label: 'Total' });
    ramp.forEach((step, index) => {
      expect(config[rowColorKey(index)]).toEqual({
        label: 'Total',
        theme: step,
      });
    });
  });
});
