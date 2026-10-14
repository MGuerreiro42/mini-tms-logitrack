import type { ReactNode } from 'react';

interface NoticePageProps {
  code?: string;
  title: ReactNode;
  description: ReactNode;
  actions: ReactNode;
}

export function NoticePage({
  code,
  title,
  description,
  actions,
}: NoticePageProps) {
  return (
    <main className="flex min-h-dvh items-center justify-center p-5">
      <div className="flex w-full max-w-115 flex-col gap-3.5 rounded-2xl bg-card px-8.5 py-8 shadow-panel">
        {code && (
          <span className="font-mono text-[13px] text-muted-foreground">
            {code}
          </span>
        )}
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="text-[15px] leading-normal text-muted-foreground">
          {description}
        </p>
        <div className="flex flex-wrap items-center gap-2.5 pt-1">
          {actions}
        </div>
      </div>
    </main>
  );
}
