'use client';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ALL } from '@/lib/filters';
import { sumRecord } from '@/lib/sum-record';

export type StatusFilter<S extends string> = S | typeof ALL;

export interface StatusFilterOption<S extends string> {
  label: string;
  value: StatusFilter<S>;
  count?: number;
}

interface StatusFilterOptionsConfig<S extends string> {
  counts?: Record<S, number>;
  allPosition?: 'first' | 'last';
}

export function statusFilterOptions<S extends string>(
  meta: Record<S, { label: string }>,
  statuses: S[],
  { counts, allPosition = 'first' }: StatusFilterOptionsConfig<S> = {},
): StatusFilterOption<S>[] {
  const all: StatusFilterOption<S> = {
    label: 'All',
    value: ALL,
    count: counts && sumRecord(counts),
  };
  const options = statuses.map((status) => ({
    label: meta[status].label,
    value: status,
    count: counts?.[status],
  }));
  return allPosition === 'first' ? [all, ...options] : [...options, all];
}

export function statusFilterValues<S extends string>(
  options: StatusFilterOption<S>[],
): StatusFilter<S>[] {
  return options.map((option) => option.value);
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
