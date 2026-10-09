import type { ReactNode } from 'react';

type ChartSectionProps = {
  title: string;
  isEmpty: boolean;
  emptyMessage: string;
  children: ReactNode;
};

export function ChartSection({
  title,
  isEmpty,
  emptyMessage,
  children,
}: ChartSectionProps) {
  if (isEmpty) {
    return (
      <div className="rounded-xl border border-dashed py-16 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold">{title}</h2>
      {children}
    </section>
  );
}
