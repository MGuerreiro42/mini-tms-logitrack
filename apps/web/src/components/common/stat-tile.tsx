import { cn } from '@/lib/utils';

export function StatTile({
  label,
  value,
  accentClassName,
}: {
  label: string;
  value: string | number;
  accentClassName?: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className={cn('text-2xl font-bold tracking-tight', accentClassName)}>
        {value}
      </div>
      <div className="mt-1 text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
