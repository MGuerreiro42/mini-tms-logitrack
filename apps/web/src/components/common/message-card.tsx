import type { ReactNode } from 'react';

export function CenteredPage({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-6">
      {children}
    </div>
  );
}

interface MessageCardProps {
  title: string;
  description: string;
  children?: ReactNode;
}

export function MessageCard({
  title,
  description,
  children,
}: MessageCardProps) {
  return (
    <div className="w-full max-w-sm space-y-4 rounded-xl border bg-card p-8 text-center shadow-sm">
      <h1 className="text-lg font-semibold">{title}</h1>
      <p className="text-sm text-muted-foreground">{description}</p>
      {children && <div className="flex justify-center gap-2">{children}</div>}
    </div>
  );
}
