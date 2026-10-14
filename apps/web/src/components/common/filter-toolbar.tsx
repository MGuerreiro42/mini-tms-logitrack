'use client';

import { ChevronDownIcon } from 'lucide-react';
import type { ReactNode } from 'react';
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
import { cn } from '@/lib/utils';

export interface FilterChoice<V extends string> {
  value: V;
  label: string;
  count?: number;
}

interface FilterMenuProps<V extends string> {
  label: string;
  value: V;
  options: FilterChoice<V>[];
  onChange: (value: V) => void;
}

export function FilterMenu<V extends string>({
  label,
  value,
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
            value !== ALL && 'bg-selected hover:bg-selected',
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

  return (
    <fieldset className="hidden rounded-md bg-muted p-0.75 md:flex">
      <legend className="sr-only">Density</legend>
      {DENSITIES.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={density === option}
          onClick={() => setDensity(option)}
          className="h-8.5 rounded-sm px-3 text-[13px] text-muted-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50 aria-pressed:bg-card aria-pressed:font-semibold aria-pressed:text-foreground aria-pressed:shadow-xs"
        >
          {DENSITY_LABEL[option]}
        </button>
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
