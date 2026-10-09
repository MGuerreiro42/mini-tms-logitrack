import type { ComponentType, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { ChartIndicator, type IndicatorShape } from './chart-indicator';
import type { TooltipContentProps, TooltipItem } from './chart-tooltip.types';

type ChartTooltipItemProps = {
  item: TooltipItem;
  index: number;
  label: ReactNode;
  icon?: ComponentType;
  indicator: IndicatorShape;
  showIndicator: boolean;
  color?: string;
  nestedLabel?: ReactNode;
  formatter?: TooltipContentProps['formatter'];
};

function formatValue(value: TooltipItem['value']): string {
  return typeof value === 'number' ? value.toLocaleString() : String(value);
}

export function ChartTooltipItem({
  item,
  index,
  label,
  icon: Icon,
  indicator,
  showIndicator,
  color,
  nestedLabel,
  formatter,
}: ChartTooltipItemProps) {
  const nested = nestedLabel !== undefined;

  return (
    <div
      className={cn(
        'flex w-full flex-wrap items-stretch gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5 [&>svg]:text-muted-foreground',
        indicator === 'dot' && 'items-center',
      )}
    >
      {formatter && item.value !== undefined && item.name ? (
        formatter(item.value, item.name, item, index, item.payload)
      ) : (
        <>
          {Icon ? (
            <Icon />
          ) : (
            showIndicator && (
              <ChartIndicator shape={indicator} color={color} nested={nested} />
            )
          )}
          <div
            className={cn(
              'flex flex-1 justify-between leading-none',
              nested ? 'items-end' : 'items-center',
            )}
          >
            <div className="grid gap-1.5">
              {nestedLabel}
              <span className="text-muted-foreground">{label}</span>
            </div>
            {item.value != null && (
              <span className="font-mono font-medium text-foreground tabular-nums">
                {formatValue(item.value)}
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
