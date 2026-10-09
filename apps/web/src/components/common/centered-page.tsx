import type { ReactNode } from 'react';

export function CenteredPage({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-6">
      {children}
    </div>
  );
}
