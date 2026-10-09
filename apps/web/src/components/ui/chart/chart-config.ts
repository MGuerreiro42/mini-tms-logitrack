import type { ComponentType, ReactNode } from 'react';

export const THEMES = { light: '', dark: '.dark' } as const;

export type ChartTheme = keyof typeof THEMES;

export type ChartConfig = Record<
  string,
  { label?: ReactNode; icon?: ComponentType } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<ChartTheme, string> }
  )
>;

export type ChartItemConfig = ChartConfig[string];
