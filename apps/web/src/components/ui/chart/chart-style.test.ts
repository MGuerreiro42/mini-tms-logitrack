import { buildChartCss } from './chart-style';

describe('buildChartCss', () => {
  it('emits a color variable per configured key for every theme', () => {
    const css = buildChartCss('chart-1', {
      onTime: { label: 'On time', color: '#111' },
      late: { label: 'Late', theme: { light: '#222', dark: '#333' } },
    });

    expect(css).toBe(
      ' [data-chart=chart-1] {\n  --color-onTime: #111;\n  --color-late: #222;\n}\n' +
        '.dark [data-chart=chart-1] {\n  --color-onTime: #111;\n  --color-late: #333;\n}',
    );
  });

  it('returns an empty string when no key has a color', () => {
    expect(buildChartCss('chart-1', { total: { label: 'Total' } })).toBe('');
  });
});
