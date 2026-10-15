import { CheckIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type StepDotState = 'done' | 'current' | 'upcoming';

interface StepDotProps {
  state: StepDotState;
  number: number;
  live?: boolean;
  className?: string;
}

export function StepDot({ state, number, live, className }: StepDotProps) {
  return (
    <span
      aria-hidden
      className={cn(
        'flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
        state === 'upcoming'
          ? 'bg-muted text-muted-foreground'
          : 'bg-primary text-primary-foreground',
        live && state === 'current' && 'ring-5 ring-live-halo',
        className,
      )}
    >
      {state === 'done' ? <CheckIcon className="size-3.5" /> : number}
    </span>
  );
}
