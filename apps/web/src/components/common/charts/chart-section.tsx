import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type ChartSectionProps = {
  title: string;
  description?: string;
  isEmpty: boolean;
  emptyMessage: string;
  className?: string;
  children: ReactNode;
};

export function ChartSection({
  title,
  description,
  isEmpty,
  emptyMessage,
  className,
  children,
}: ChartSectionProps) {
  return (
    <section
      className={cn(
        'flex flex-col gap-3 rounded-xl bg-card px-6 py-5 shadow-panel',
        className,
      )}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-base font-semibold">{title}</h2>
        {description && !isEmpty && (
          <p className="text-[13px] text-muted-foreground">{description}</p>
        )}
      </div>
      {isEmpty ? (
        <p className="max-w-[65ch] py-6 text-sm text-muted-foreground">
          {emptyMessage}
        </p>
      ) : (
        children
      )}
    </section>
  );
}
