import { cn } from '@/lib/utils';

// A code split across lines can't be read back or compared at a glance.
export function TrackingCode({
  code,
  className,
}: {
  code: string;
  className?: string;
}) {
  return (
    <span className={cn('font-mono whitespace-nowrap', className)}>{code}</span>
  );
}
