import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

const LOGO = (
  <div className="mx-auto mb-2 flex size-10 items-center justify-center rounded-lg bg-primary font-mono text-sm font-semibold text-primary-foreground">
    TMS
  </div>
);

interface PublicCardProps {
  title: ReactNode;
  description?: ReactNode;
  // Shown above the title; the TMS logo unless replaced or turned off.
  badge?: ReactNode | false;
  align?: 'center' | 'start';
  actions?: ReactNode;
  children?: ReactNode;
}

// The card shell shared by public, auth and error pages.
export function PublicCard({
  title,
  description,
  badge = LOGO,
  align = 'center',
  actions,
  children,
}: PublicCardProps) {
  return (
    <div className="w-full max-w-sm space-y-6 rounded-xl border bg-card p-8 shadow-sm">
      <div className={cn('space-y-1', align === 'center' && 'text-center')}>
        {badge}
        <h1 className="text-lg font-semibold">{title}</h1>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {children}
      {actions && <div className="flex justify-center gap-2">{actions}</div>}
    </div>
  );
}
