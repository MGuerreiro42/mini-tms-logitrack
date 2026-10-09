'use client';

import type { ReactNode } from 'react';
import { Tooltip } from 'recharts';
import { cn } from '@/lib/utils';
import type { ChartConfig } from './chart-config';
import { useChart } from './chart-context';
import type { TooltipContentProps } from './chart-tooltip.types';
import { ChartTooltipItem } from './chart-tooltip-item';
import { getItemConfig } from './get-item-config';

export const ChartTooltip = Tooltip;

function resolveLabel(
  config: ChartConfig,
  { payload, label, labelKey, labelFormatter }: TooltipContentProps,
): ReactNode {
  const [item] = payload ?? [];
  if (!item) return null;

  const key = `${labelKey ?? item.dataKey ?? item.name ?? 'value'}`;
  const value =
    !labelKey && typeof label === 'string'
      ? (config[label]?.label ?? label)
      : getItemConfig(config, item, key)?.label;

  return labelFormatter ? labelFormatter(value, payload ?? []) : value;
}

export function ChartTooltipContent(props: TooltipContentProps) {
  const {
    active,
    payload,
    className,
    indicator = 'dot',
    hideLabel = false,
    hideIndicator = false,
    labelClassName,
    formatter,
    color,
    nameKey,
  } = props;
  const { config } = useChart();

  if (!active || !payload?.length) return null;

  const labelValue = hideLabel ? null : resolveLabel(config, props);
  const tooltipLabel = labelValue ? (
    <div className={cn('font-medium', labelClassName)}>{labelValue}</div>
  ) : null;
  const nestLabel = payload.length === 1 && indicator !== 'dot';

  return (
    <div
      className={cn(
        'grid min-w-32 items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl',
        className,
      )}
    >
      {!nestLabel && tooltipLabel}
      <div className="grid gap-1.5">
        {payload
          .filter((item) => item.type !== 'none')
          .map((item, index) => {
            const key = `${nameKey ?? item.name ?? item.dataKey ?? 'value'}`;
            const itemConfig = getItemConfig(config, item, key);

            return (
              <ChartTooltipItem
                key={key}
                item={item}
                index={index}
                label={itemConfig?.label ?? item.name}
                icon={itemConfig?.icon}
                indicator={indicator}
                showIndicator={!hideIndicator}
                color={color ?? item.payload?.fill ?? item.color}
                nestedLabel={nestLabel ? tooltipLabel : undefined}
                formatter={formatter}
              />
            );
          })}
      </div>
    </div>
  );
}
