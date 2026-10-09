import type { ComponentProps } from 'react';
import type {
  DefaultTooltipContentProps,
  Tooltip,
  TooltipValueType,
} from 'recharts';
import type { IndicatorShape } from './chart-indicator';

export type TooltipContentProps = ComponentProps<typeof Tooltip> &
  ComponentProps<'div'> & {
    hideLabel?: boolean;
    hideIndicator?: boolean;
    indicator?: IndicatorShape;
    nameKey?: string;
    labelKey?: string;
  } & Omit<
    DefaultTooltipContentProps<TooltipValueType, number | string>,
    'accessibilityLayer'
  >;

export type TooltipItem = NonNullable<TooltipContentProps['payload']>[number];
