import { TriangleAlertIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface ErrorStateProps {
  title: ReactNode;
  description?: ReactNode;
  actions: ReactNode;
}

export function ErrorState({ title, description, actions }: ErrorStateProps) {
  return (
    <div role="alert" className="flex flex-col items-start gap-3 py-8">
      <span
        aria-hidden
        className="flex size-11 items-center justify-center rounded-lg bg-destructive-tint text-destructive"
      >
        <TriangleAlertIcon className="size-5" />
      </span>
      <p className="text-lg font-semibold">{title}</p>
      {description && (
        <p className="max-w-[65ch] text-[15px] text-muted-foreground">
          {description}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2.5">{actions}</div>
    </div>
  );
}

export interface NextStep {
  label: string;
  action?: ReactNode;
}

interface EmptyStateProps {
  title: ReactNode;
  description?: ReactNode;
  steps?: NextStep[];
}

export function EmptyState({ title, description, steps }: EmptyStateProps) {
  return (
    <div className="flex flex-col gap-5 py-8">
      <div className="space-y-2">
        <p className="text-xl font-semibold tracking-tight">{title}</p>
        {description && (
          <p className="max-w-[65ch] text-[15px] text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {steps && steps.length > 0 && (
        <ol className="flex max-w-xl flex-col gap-2.5">
          {steps.map((step, index) => (
            <li
              key={step.label}
              className="flex items-center gap-3.5 rounded-lg bg-card px-4 py-3 shadow-xs"
            >
              <span
                aria-hidden
                className="flex size-7 shrink-0 items-center justify-center rounded-sm bg-muted text-[13px] font-semibold"
              >
                {index + 1}
              </span>
              <span className="flex-1 text-[15px]">{step.label}</span>
              {step.action}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
