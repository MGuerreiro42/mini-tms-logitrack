import Link from 'next/link';
import type { ReactNode } from 'react';
import { ROUTES } from '@/lib/routes';
import { cn } from '@/lib/utils';

const FACTS = [
  'Sellers create shipments and pick a carrier that covers the destination.',
  'Carriers claim shipments from a shared queue and move them step by step.',
  'Every status change reaches everyone live, public tracking included.',
];

interface PublicPageProps {
  title?: ReactNode;
  description?: ReactNode;
  footer?: ReactNode;
  layout?: 'split' | 'single';
  children?: ReactNode;
}

export function PublicPage({
  title,
  description,
  footer,
  layout = 'split',
  children,
}: PublicPageProps) {
  const panel = (
    <div
      className={cn(
        'flex w-full flex-col gap-5.5 rounded-2xl bg-card px-6 py-7 shadow-panel sm:px-9 sm:pt-9 sm:pb-8',
        layout === 'split' ? 'max-w-105' : 'max-w-190 sm:px-10',
      )}
    >
      {title && (
        <div className="flex flex-col gap-1.5">
          <h1 className="text-[26px] font-semibold tracking-[-0.02em]">
            {title}
          </h1>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      )}
      {children}
      {footer && (
        <div className="flex flex-col gap-2.5 border-t border-muted pt-4.5 text-sm text-muted-foreground">
          {footer}
        </div>
      )}
    </div>
  );

  if (layout === 'single') {
    return (
      <div className="flex min-h-dvh flex-col">
        <header className="flex h-16 items-center gap-2.5 bg-nav px-5 shadow-nav lg:px-12">
          <Brand />
          <span className="text-sm text-muted-foreground">
            Shipment tracking
          </span>
        </header>
        <main className="flex flex-1 items-start justify-center px-4 py-6 lg:px-12 lg:py-10">
          {panel}
        </main>
      </div>
    );
  }

  return (
    <div className="grid min-h-dvh grid-cols-1 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <section className="flex flex-col justify-between gap-10 px-5 pt-7 lg:px-18 lg:py-14">
        <Brand />
        <div className="hidden max-w-140 flex-col gap-5.5 lg:flex">
          <p className="text-[56px] leading-[1.02] font-semibold tracking-[-0.035em]">
            Every shipment, live, from claim to doorstep.
          </p>
          <ul className="flex flex-col gap-3 text-[17px] leading-normal text-muted-foreground">
            {FACTS.map((fact) => (
              <li key={fact} className="flex gap-3">
                <span
                  aria-hidden
                  className="mt-2.5 size-1.5 shrink-0 rounded-full bg-primary"
                />
                {fact}
              </li>
            ))}
          </ul>
        </div>
        <p className="hidden text-[13px] text-muted-foreground lg:block">
          Portfolio project · demo data only
        </p>
      </section>
      <main className="flex justify-center px-4 py-6 lg:items-center lg:p-14">
        {panel}
      </main>
    </div>
  );
}

function Brand() {
  return (
    <Link
      href={ROUTES.home}
      className="flex w-fit items-center gap-2.5 rounded-sm outline-none pointer-coarse:min-h-11 focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <span className="flex size-8 items-center justify-center rounded-md bg-primary font-mono text-[11px] font-semibold text-primary-foreground">
        TMS
      </span>
      <span className="text-[17px] font-semibold">Mini TMS</span>
    </Link>
  );
}
