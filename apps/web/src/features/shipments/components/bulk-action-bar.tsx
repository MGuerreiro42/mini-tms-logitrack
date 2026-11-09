'use client';

import { XIcon } from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { Button } from '@/components/ui/button';
import { useAppOrigin } from '@/hooks/use-app-origin';
import { plural } from '@/lib/plural';
import { publicTrackingPath } from '@/lib/public-tracking-path';
import { useBulkCancel } from '../hooks/use-bulk-cancel';
import { isCancellableBySeller, type Shipment } from '../types';

interface BulkActionBarProps {
  selected: Pick<Shipment, 'id' | 'trackingCode' | 'status'>[];
  onClear: () => void;
}

export function BulkActionBar({ selected, onClear }: BulkActionBarProps) {
  const origin = useAppOrigin();
  const bulkCancel = useBulkCancel();
  const cancellable = selected.filter((s) => isCancellableBySeller(s.status));
  const skipped = selected.length - cancellable.length;

  async function copyLinks() {
    const links = selected.map(
      (s) => `${origin}${publicTrackingPath(s.trackingCode)}`,
    );
    try {
      await navigator.clipboard.writeText(links.join('\n'));
      toast.success(`Copied ${plural(links.length, 'tracking link')}`);
    } catch {
      toast.error("Couldn't copy the links");
    }
  }

  return (
    <section
      aria-label="Bulk actions"
      className="flex min-h-10 flex-wrap items-center gap-2.5 rounded-lg bg-selected px-3 py-1.5"
    >
      <span className="text-sm font-semibold">{selected.length} selected</span>
      <Button variant="secondary" size="sm" onClick={copyLinks}>
        Copy tracking links
      </Button>
      {cancellable.length > 0 && (
        <ConfirmDialog
          trigger={
            <Button variant="secondary" size="sm">
              Cancel {cancellable.length}…
            </Button>
          }
          title={`Cancel ${plural(cancellable.length, 'shipment')}?`}
          description={
            skipped > 0
              ? `${skipped} can't be cancelled: they are already with the carrier.`
              : 'The carrier is told and the shipments leave its queue.'
          }
          confirmLabel={`Cancel ${plural(cancellable.length, 'shipment')}`}
          dismissLabel="Keep them"
          variant="destructive"
          onConfirm={async () => {
            await bulkCancel(cancellable);
            onClear();
          }}
        />
      )}
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Clear selection"
        className="ml-auto"
        onClick={onClear}
      >
        <XIcon aria-hidden />
      </Button>
    </section>
  );
}
