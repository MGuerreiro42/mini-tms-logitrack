import type { ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface PanelProps {
  title: ReactNode;
  aside?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Panel({
  title,
  aside,
  footer,
  children,
  className,
}: PanelProps) {
  return (
    <Card className={cn('gap-4 px-5.5', className)}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">{title}</h2>
        {aside}
      </div>
      {children}
      {footer}
    </Card>
  );
}
