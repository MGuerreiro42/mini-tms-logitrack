'use client';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export const ALL = 'ALL';
export type StatusFilter<S extends string> = S | typeof ALL;

export interface StatusFilterOption<S extends string> {
  label: string;
  value: StatusFilter<S>;
}

export function statusFilterOptions<S extends string>(
  meta: Record<S, { label: string }>,
  statuses: S[],
  allPosition: 'first' | 'last' = 'first',
): StatusFilterOption<S>[] {
  const all: StatusFilterOption<S> = { label: 'All', value: ALL };
  const options = statuses.map((status) => ({
    label: meta[status].label,
    value: status,
  }));
  return allPosition === 'first' ? [all, ...options] : [...options, all];
}

interface StatusFilterTabsProps<S extends string> {
  options: StatusFilterOption<S>[];
  value: StatusFilter<S>;
  onChange: (value: StatusFilter<S>) => void;
  wrap?: boolean;
}

export function StatusFilterTabs<S extends string>({
  options,
  value,
  onChange,
  wrap,
}: StatusFilterTabsProps<S>) {
  return (
    <Tabs
      value={value}
      onValueChange={(next) => onChange(next as StatusFilter<S>)}
    >
      <TabsList className={wrap ? 'flex-wrap' : undefined}>
        {options.map((option) => (
          <TabsTrigger key={option.value} value={option.value}>
            {option.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
