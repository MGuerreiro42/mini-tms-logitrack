'use client';

import type { LucideIcon } from 'lucide-react';
import { useId } from 'react';

interface DemoRoleCardProps {
  icon: LucideIcon;
  label: string;
  persona: string;
  description: string;
  pending: boolean;
  disabled: boolean;
  onSelect: () => void;
}

// Named by its label alone; the persona and description describe it.
export function DemoRoleCard({
  icon: Icon,
  label,
  persona,
  description,
  pending,
  disabled,
  onSelect,
}: DemoRoleCardProps) {
  const id = useId();

  return (
    <button
      type="button"
      aria-labelledby={`${id}-label`}
      aria-describedby={`${id}-persona ${id}-description`}
      aria-busy={pending}
      disabled={disabled}
      onClick={onSelect}
      className="flex min-h-16 w-full items-start gap-3 rounded-xl bg-card px-4 py-3 text-left shadow-panel outline-none transition-colors hover:bg-selected focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60 disabled:hover:bg-card"
    >
      <Icon aria-hidden className="mt-0.5 size-5 shrink-0 text-primary" />
      <span className="flex min-w-0 flex-col gap-0.5">
        <span id={`${id}-label`} className="text-[15px] font-semibold">
          {label}
        </span>
        <span
          id={`${id}-persona`}
          className="text-xs font-medium text-muted-foreground"
        >
          {persona}
        </span>
        <span id={`${id}-description`} className="mt-1 text-[13px]">
          {pending ? 'Signing in…' : description}
        </span>
      </span>
    </button>
  );
}
