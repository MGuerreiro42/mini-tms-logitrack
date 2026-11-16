'use client';

import { type FilterChip, FilterChips } from '@/components/common/filter-chips';
import {
  type FilterChoice,
  FilterMenu,
  FilterToolbar,
} from '@/components/common/filter-toolbar';
import { SearchField } from '@/components/common/search-field';
import { type ViewTabOption, ViewTabs } from '@/components/common/view-tabs';
import { ALL } from '@/lib/filters';
import { plural } from '@/lib/plural';
import { SHIPMENT_STATUS } from '@/lib/status-colors';
import type { ShipmentStatus } from '../types';

export type ShipmentListFilters = Record<string, string> & {
  view: string;
  status: string;
  q: string;
};

// The slice of useFilteredPagination the toolbar drives.
export interface ShipmentListControls<F extends ShipmentListFilters> {
  filters: F;
  defaults: F;
  isFiltered: boolean;
  setFilters: (changes: Partial<F>) => void;
}

export interface ShipmentListMenu<F> {
  key: keyof F & string;
  label: string;
  options: FilterChoice<string>[];
}

type Tabs = ViewTabOption<'view' | 'status'>[];

// Any status replaces the view; one without a tab (an old ?status= link) is also a filter.
export function listScope<F extends ShipmentListFilters>(
  { filters, defaults, isFiltered }: ShipmentListControls<F>,
  tabs: Tabs,
) {
  const strayStatus =
    filters.status !== defaults.status &&
    !tabs.some((tab) => tab.key === 'status' && tab.value === filters.status)
      ? (filters.status as ShipmentStatus)
      : undefined;
  return {
    strayStatus,
    isFiltered: isFiltered || strayStatus !== undefined,
    view:
      filters.status !== defaults.status || filters.view === ALL
        ? undefined
        : filters.view,
  };
}

interface ShipmentListToolbarProps<F extends ShipmentListFilters> {
  list: ShipmentListControls<F>;
  tabs: Tabs;
  menus?: ShipmentListMenu<F>[];
  placeholder: string;
  total?: number;
}

export function ShipmentListToolbar<F extends ShipmentListFilters>({
  list,
  tabs,
  menus = [],
  placeholder,
  total,
}: ShipmentListToolbarProps<F>) {
  const { filters, defaults, setFilters } = list;
  const { strayStatus, isFiltered } = listScope(list, tabs);
  const reset = (...keys: (keyof F & string)[]) =>
    setFilters(
      Object.fromEntries(keys.map((key) => [key, defaults[key]])) as Partial<F>,
    );
  const menuKeys = menus.map((menu) => menu.key);

  const chips: FilterChip[] = [
    ...(strayStatus
      ? [
          {
            id: 'status',
            label: `Status: ${SHIPMENT_STATUS[strayStatus].label}`,
            onRemove: () => reset('status'),
          },
        ]
      : []),
    ...menus.flatMap((menu) => {
      const value = filters[menu.key];
      const choice = menu.options.find((option) => option.value === value);
      return value === defaults[menu.key] || !choice
        ? []
        : [
            {
              id: menu.key,
              label: `${menu.label}: ${choice.label}`,
              onRemove: () => reset(menu.key),
            },
          ];
    }),
    ...(filters.q
      ? [
          {
            id: 'q',
            label: `Search: ${filters.q}`,
            onRemove: () => reset('q'),
          },
        ]
      : []),
  ];

  return (
    <>
      <ViewTabs
        options={tabs}
        // A status overrides the view: its own tab is selected, a stray one selects none.
        filters={
          filters.status === defaults.status
            ? filters
            : { ...filters, view: strayStatus ? '' : defaults.view }
        }
        defaults={defaults}
        onChange={(changes) =>
          setFilters({ ...changes, status: changes.status ?? defaults.status })
        }
      />
      <FilterToolbar
        onClear={
          isFiltered
            ? () =>
                reset(
                  'q',
                  ...menuKeys,
                  ...(strayStatus ? (['status'] as const) : []),
                )
            : undefined
        }
        summary={total !== undefined && plural(total, 'shipment')}
      >
        <SearchField
          value={filters.q}
          onChange={(q) => setFilters({ q } as Partial<F>)}
          placeholder={placeholder}
        />
        {menus.map((menu) => (
          <FilterMenu
            key={menu.key}
            label={menu.label}
            value={filters[menu.key]}
            defaultValue={defaults[menu.key]}
            options={menu.options}
            onChange={(value) =>
              setFilters({ [menu.key]: value } as Partial<F>)
            }
          />
        ))}
      </FilterToolbar>
      <FilterChips chips={chips} />
    </>
  );
}
