'use client';

import { XIcon } from 'lucide-react';
import { useState } from 'react';
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
  // The ids still selected after an action; empty clears the selection.
  onDone: (keep: string[]) => void;
}

export function BulkActionBar({ selected, onDone }: BulkActionBarProps) {
  const origin = useAppOrigin();
  const bulkCancel = useBulkCancel();
  const cancellable = selected.filter((s) => isCancellableBySeller(s.status));
  // Frozen when the dialog opens, so a live update can't change what is being confirmed.
  const [confirming, setConfirming] = useState({
    cancellable,
    skipped: 0,
  });

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
      <span role="status" className="text-sm font-semibold">
        {selected.length} selected
      </span>
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
          onOpenChange={(open) => {
            if (open) {
              setConfirming({
                cancellable,
                skipped: selected.length - cancellable.length,
              });
            }
          }}
          title={`Cancel ${plural(confirming.cancellable.length, 'shipment')}?`}
          description={[
            confirming.skipped > 0 &&
              `${confirming.skipped} can't be cancelled at this stage.`,
            'The carrier is told and the shipments leave its queue.',
          ]
            .filter(Boolean)
            .join(' ')}
          confirmLabel={`Cancel ${plural(confirming.cancellable.length, 'shipment')}`}
          dismissLabel="Keep them"
          variant="destructive"
          onConfirm={async () =>
            onDone(await bulkCancel(confirming.cancellable))
          }
        />
      )}
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Clear selection"
        className="ml-auto"
        onClick={() => onDone([])}
      >
        <XIcon aria-hidden />
      </Button>
    </section>
  );
}
