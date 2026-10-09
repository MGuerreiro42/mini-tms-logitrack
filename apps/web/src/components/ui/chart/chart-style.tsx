import { type ChartConfig, type ChartTheme, THEMES } from './chart-config';

export function buildChartCss(id: string, config: ChartConfig): string {
  const colored = Object.entries(config).filter(
    ([, item]) => item.theme ?? item.color,
  );
  if (!colored.length) return '';

  return Object.entries(THEMES)
    .map(([theme, prefix]) => {
      const vars = colored
        .map(([key, item]) => {
          const color = item.theme?.[theme as ChartTheme] ?? item.color;
          return color ? `  --color-${key}: ${color};` : null;
        })
        .filter(Boolean)
        .join('\n');
      return `${prefix} [data-chart=${id}] {\n${vars}\n}`;
    })
    .join('\n');
}

export function ChartStyle({
  id,
  config,
}: {
  id: string;
  config: ChartConfig;
}) {
  const css = buildChartCss(id, config);
  return css ? <style dangerouslySetInnerHTML={{ __html: css }} /> : null;
}
