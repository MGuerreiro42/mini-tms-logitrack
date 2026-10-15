'use client';

import { ChevronDownIcon } from 'lucide-react';
import { type ReactNode, useSyncExternalStore } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DENSITIES, setDensity, useDensity } from '@/hooks/use-density';
import { ALL } from '@/lib/filters';
import { subscribeNever } from '@/lib/subscribe-never';
import { cn } from '@/lib/utils';

export interface FilterChoice<V extends string> {
  value: V;
  label: string;
  count?: number;
}

interface FilterMenuProps<V extends string> {
  label: string;
  value: V;
  defaultValue?: V;
  options: FilterChoice<V>[];
  onChange: (value: V) => void;
}

export function FilterMenu<V extends string>({
  label,
  value,
  defaultValue = ALL as V,
  options,
  onChange,
}: FilterMenuProps<V>) {
  const selected = options.find((option) => option.value === value);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'font-normal',
            value !== defaultValue && 'bg-selected hover:bg-selected',
          )}
        >
          {label}: <span className="font-semibold">{selected?.label}</span>{' '}
          {selected?.count !== undefined && <Count value={selected.count} />}
          <ChevronDownIcon aria-hidden className="text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-auto min-w-52">
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(next) => onChange(next as V)}
        >
          {options.map((option) => (
            <DropdownMenuRadioItem
              key={option.value}
              value={option.value}
              className="gap-4 py-2 pointer-coarse:min-h-11"
            >
              {option.label}
              {option.count !== undefined && (
                <span className="ml-auto">
                  <Count value={option.count} />
                </span>
              )}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Count({ value }: { value: number }) {
  return (
    <span className="font-mono text-xs text-muted-foreground">{value}</span>
  );
}

const DENSITY_LABEL = { comfortable: 'Comfortable', compact: 'Compact' };

function DensityToggle() {
  const density = useDensity();
  // The stored choice is unknown on the server; staying invisible until mount avoids a visible flip.
  const mounted = useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  );

  return (
    <fieldset
      className={cn(
        'hidden rounded-md bg-muted p-0.75 md:flex',
        !mounted && 'invisible',
      )}
    >
      <legend className="sr-only">Density</legend>
      {DENSITIES.map((option) => (
        <label
          key={option}
          className="flex h-8.5 cursor-pointer items-center rounded-sm px-3 text-[13px] text-muted-foreground has-checked:bg-card has-checked:font-semibold has-checked:text-foreground has-checked:shadow-xs has-focus-visible:ring-3 has-focus-visible:ring-ring/50"
        >
          <input
            type="radio"
            name="density"
            value={option}
            checked={mounted && density === option}
            onChange={() => setDensity(option)}
            className="sr-only"
          />
          {DENSITY_LABEL[option]}
        </label>
      ))}
    </fieldset>
  );
}

interface FilterToolbarProps {
  children?: ReactNode;
  onClear?: () => void;
  summary?: ReactNode;
}

export function FilterToolbar({
  children,
  onClear,
  summary,
}: FilterToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      {children}
      {onClear && (
        <Button variant="link" className="px-2" onClick={onClear}>
          Clear filters
        </Button>
      )}
      <div className="ml-auto flex items-center gap-4">
        {summary && (
          <span className="text-[13px] text-muted-foreground">{summary}</span>
        )}
        <DensityToggle />
      </div>
    </div>
  );
}
