import { StepDot } from '@/components/common/step-dot';
import { cn } from '@/lib/utils';

export interface StepItem {
  label: string;
  detail?: string;
}

interface StepIndicatorProps {
  steps: StepItem[];
  current: number;
  label?: string;
}

export function StepIndicator({
  steps,
  current,
  label = 'Steps',
}: StepIndicatorProps) {
  return (
    <ol aria-label={label} className="grid auto-cols-fr grid-flow-col gap-3">
      {steps.map((step, index) => {
        const done = index < current;
        const isCurrent = index === current;
        return (
          <li
            key={step.label}
            aria-current={isCurrent ? 'step' : undefined}
            className={cn(
              'flex flex-col gap-2 rounded-xl px-3 py-3 md:flex-row md:items-center md:gap-3 md:px-4 md:py-3.5',
              isCurrent && 'bg-card shadow-panel',
            )}
          >
            <StepDot
              state={done ? 'done' : isCurrent ? 'current' : 'upcoming'}
              number={index + 1}
              className="size-7.5 rounded-md text-[13px]"
            />
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="text-sm font-semibold">
                {done && <span className="sr-only">Done: </span>}
                {step.label}
              </span>
              {step.detail && (
                <span className="hidden truncate text-[13px] text-muted-foreground md:block">
                  {step.detail}
                </span>
              )}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
