import type { ChartConfig, ChartItemConfig } from './chart-config';

function stringField(source: object, key: string): string | undefined {
  const value = (source as Record<string, unknown>)[key];
  return typeof value === 'string' ? value : undefined;
}

// Recharts items may name their config key directly or inside their data row (`payload`).
export function getItemConfig(
  config: ChartConfig,
  item: unknown,
  key: string,
): ChartItemConfig | undefined {
  if (typeof item !== 'object' || item === null) return undefined;

  const row =
    'payload' in item && typeof item.payload === 'object' && item.payload
      ? item.payload
      : undefined;
  const configKey =
    stringField(item, key) ?? (row ? stringField(row, key) : undefined) ?? key;

  return config[configKey] ?? config[key];
}
