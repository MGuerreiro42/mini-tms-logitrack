'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ALL } from './status-filter-tabs';

export interface FilterOption {
  value: string;
  label: string;
}

interface FilterSelectProps {
  placeholder: string;
  allLabel: string;
  options: FilterOption[];
  value: string;
  onChange: (value: string) => void;
}

export function FilterSelect({
  placeholder,
  allLabel,
  options,
  value,
  onChange,
}: FilterSelectProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-48" aria-label={placeholder}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{allLabel}</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
