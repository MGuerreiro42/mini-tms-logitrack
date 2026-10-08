import type { ReactNode } from 'react';

interface PublicCardProps {
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
}

export function PublicCard({ title, description, children }: PublicCardProps) {
  return (
    <div className="w-full max-w-sm space-y-6 rounded-xl border bg-card p-8 shadow-sm">
      <div className="space-y-1 text-center">
        <div className="mx-auto mb-2 flex size-10 items-center justify-center rounded-lg bg-primary font-mono text-sm font-semibold text-primary-foreground">
          TMS
        </div>
        <h1 className="text-lg font-semibold">{title}</h1>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}
