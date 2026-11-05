import { Skeleton } from '@/components/ui/skeleton';

export const MAP_FRAME = 'h-60 overflow-hidden rounded-lg lg:h-80';

export function MapSkeleton() {
  return <Skeleton className={MAP_FRAME} />;
}

export function MapUnavailable() {
  return (
    <div
      className={`${MAP_FRAME} flex items-center justify-center bg-muted p-4 text-center text-sm text-muted-foreground`}
    >
      Map unavailable. The timeline below still updates live.
    </div>
  );
}
