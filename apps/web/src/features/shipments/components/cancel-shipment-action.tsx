'use client';

import { useState } from 'react';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCancelShipment } from '../hooks/use-cancel-shipment';
import { TRACKING_NOTE_MAX_LENGTH } from '../types';

export function CancelShipmentAction({ shipmentId }: { shipmentId: string }) {
  const [note, setNote] = useState('');
  const cancel = useCancelShipment();

  return (
    <ConfirmDialog
      trigger={
        <Button variant="destructive" className="w-full">
          Cancel shipment
        </Button>
      }
      title="Cancel this shipment?"
      description="The carrier will stop handling it. This can't be undone."
      confirmLabel="Cancel shipment"
      variant="destructive"
      dismissLabel="Keep shipment"
      onOpenChange={(open) => {
        if (!open) setNote('');
      }}
      onConfirm={() =>
        cancel.mutateAsync({ id: shipmentId, note: note.trim() || undefined })
      }
    >
      <div className="space-y-1.5">
        <Label htmlFor="cancel-note">Reason (optional)</Label>
        <Input
          id="cancel-note"
          value={note}
          maxLength={TRACKING_NOTE_MAX_LENGTH}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>
    </ConfirmDialog>
  );
}
