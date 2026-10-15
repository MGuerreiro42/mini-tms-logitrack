import Link from 'next/link';
import type { ReactNode } from 'react';

interface BreadcrumbProps {
  parent: { href: string; label: string };
  children: ReactNode;
}

export function Breadcrumb({ parent, children }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-2 text-[13px] text-muted-foreground">
        <li>
          <Link
            href={parent.href}
            className="rounded-xs font-semibold text-primary outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 pointer-coarse:inline-flex pointer-coarse:min-h-11 pointer-coarse:items-center"
          >
            {parent.label}
          </Link>
        </li>
        <li aria-hidden>/</li>
        <li aria-current="page" className="min-w-0 truncate">
          {children}
        </li>
      </ol>
    </nav>
  );
}
