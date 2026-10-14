import { cn } from '@/lib/utils';

function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      className={cn('rounded-xs bg-muted motion-safe:animate-pulse', className)}
      {...props}
    />
  );
}

export { Skeleton };
