'use client';

import { RadioGroup } from 'radix-ui';

interface SegmentedControlProps<T extends string> {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}

// A radio group drawn as segments: a few short options that fit at 320 px.
export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <RadioGroup.Root
      aria-label={label}
      orientation="horizontal"
      value={value}
      onValueChange={(next) => onChange(next as T)}
      className="inline-flex h-8 w-fit items-center rounded-lg bg-muted p-[3px] pointer-coarse:h-auto"
    >
      {options.map((option) => (
        <RadioGroup.Item
          key={option.value}
          value={option.value}
          className="h-full rounded-md px-3 pointer-coarse:min-h-11 pointer-coarse:min-w-11 text-[13px] font-medium tabular-nums whitespace-nowrap text-foreground/60 outline-none transition-colors hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 data-[state=checked]:bg-background data-[state=checked]:text-foreground data-[state=checked]:shadow-sm dark:text-muted-foreground dark:data-[state=checked]:text-foreground"
        >
          {option.label}
        </RadioGroup.Item>
      ))}
    </RadioGroup.Root>
  );
}
