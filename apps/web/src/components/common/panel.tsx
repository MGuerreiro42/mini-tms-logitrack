import type { ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface PanelProps {
  title: ReactNode;
  // For a region inside that names itself after the panel (aria-labelledby).
  titleId?: string;
  description?: string;
  aside?: ReactNode;
  footer?: ReactNode;
  isEmpty?: boolean;
  emptyMessage?: string;
  children: ReactNode;
  className?: string;
}

export function Panel({
  title,
  titleId,
  description,
  aside,
  footer,
  isEmpty,
  emptyMessage,
  children,
  className,
}: PanelProps) {
  return (
    <Card className={cn('gap-4 px-5.5', className)}>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <h2 id={titleId} className="text-base font-semibold">
          {title}
        </h2>
        {description && !isEmpty && (
          <p className="text-[13px] text-muted-foreground">{description}</p>
        )}
        {aside}
      </div>
      {isEmpty ? (
        <p className="max-w-[65ch] py-6 text-sm text-muted-foreground">
          {emptyMessage}
        </p>
      ) : (
        children
      )}
      {footer}
    </Card>
  );
}
