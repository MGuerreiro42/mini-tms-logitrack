import type { ReactNode } from 'react';
import { TextLink } from '@/components/common/text-link';

interface BreadcrumbProps {
  parent: { href: string; label: string };
  children: ReactNode;
}

export function Breadcrumb({ parent, children }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-2 text-[13px] text-muted-foreground">
        <li>
          <TextLink href={parent.href}>{parent.label}</TextLink>
        </li>
        <li aria-hidden>/</li>
        <li aria-current="page" className="min-w-0 truncate">
          {children}
        </li>
      </ol>
    </nav>
  );
}
