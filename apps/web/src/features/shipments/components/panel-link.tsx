import Link from 'next/link';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function PanelLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        '-mx-2 flex min-h-11 items-center gap-3.5 rounded-sm border-t border-muted px-2 py-3 outline-none hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50',
        className,
      )}
    >
      {children}
    </Link>
  );
}
