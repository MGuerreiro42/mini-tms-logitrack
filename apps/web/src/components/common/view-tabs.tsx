'use client';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ALL } from '@/lib/filters';
import { sumRecord } from '@/lib/sum-record';

export type StatusFilter<S extends string> = S | typeof ALL;

// key is the URL param the tab writes; its siblings' keys go back to their defaults.
export interface ViewTabOption<K extends string = string> {
  key: K;
  label: string;
  value: string;
  count?: number;
}

export interface StatusFilterOption<S extends string>
  extends ViewTabOption<'status'> {
  value: StatusFilter<S>;
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
    key: 'status',
    label: 'All',
    value: ALL,
    count: counts && sumRecord(counts),
  };
  const options = statuses.map((status) => ({
    key: 'status' as const,
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

interface ViewTabsProps<F extends Record<string, string>> {
  options: ViewTabOption<keyof F & string>[];
  filters: F;
  // The filters' cleared state, from useFilteredPagination.
  defaults: F;
  onChange: (changes: Partial<F>) => void;
}

const idOf = ({ key, value }: ViewTabOption) => `${key}:${value}`;

export function ViewTabs<F extends Record<string, string>>({
  options,
  filters,
  defaults,
  onChange,
}: ViewTabsProps<F>) {
  const keys = [...new Set(options.map((option) => option.key))];
  // Selecting a tab clears the other keys, so a tab is on only when they are all cleared.
  const changesFor = (option: ViewTabOption) =>
    Object.fromEntries(
      keys.map((key) => [
        key,
        key === option.key ? option.value : defaults[key],
      ]),
    ) as Partial<F>;
  const selected = options.find((option) =>
    keys.every((key) => filters[key] === changesFor(option)[key]),
  );

  return (
    <Tabs
      value={selected ? idOf(selected) : ''}
      onValueChange={(id) => {
        const option = options.find((candidate) => idOf(candidate) === id);
        if (option) onChange(changesFor(option));
      }}
    >
      <TabsList className="max-w-full max-md:snap-x max-md:justify-start max-md:overflow-x-auto max-md:[scrollbar-width:none]">
        {options.map((option) => (
          <TabsTrigger
            key={idOf(option)}
            value={idOf(option)}
            aria-label={
              option.count === undefined
                ? undefined
                : `${option.label}, ${option.count}`
            }
            className="pointer-coarse:px-3 max-md:flex-none max-md:snap-start"
          >
            {option.label}
            {option.count !== undefined && (
              <span className="font-mono text-xs text-muted-foreground">
                {option.count}
              </span>
            )}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
