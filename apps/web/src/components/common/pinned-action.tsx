import { cn } from '@/lib/utils';

export function PinnedAction({
  children,
  pinned = true,
}: {
  children: React.ReactNode;
  pinned?: boolean;
}) {
  // Same wrapper pinned or not so an open dialog stays mounted.
  return (
    <div
      data-pinned-action={pinned || undefined}
      className={cn(
        pinned &&
          'lg:ml-auto max-lg:not-short:fixed max-lg:not-short:inset-x-0 max-lg:not-short:bottom-[calc(--spacing(13)+max(--spacing(2),env(safe-area-inset-bottom)))] max-lg:not-short:z-30 max-lg:not-short:bg-nav/95 max-lg:not-short:px-safe-4 max-lg:not-short:py-2.5 max-lg:not-short:shadow-tab-bar max-lg:not-short:backdrop-blur max-lg:flex max-lg:justify-center max-lg:*:h-12 max-lg:*:w-full max-lg:*:max-w-md',
      )}
    >
      {children}
    </div>
  );
}
