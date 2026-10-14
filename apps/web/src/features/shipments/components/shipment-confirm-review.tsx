'use client';

import { FormError } from '@/components/common/form-error';
import { Button } from '@/components/ui/button';
import { useCreateShipment } from '../hooks/use-create-shipment';
import type { CreateShipmentInput, ModalityOption } from '../types';
import { ShipmentSummary } from './shipment-summary';

interface ShipmentConfirmReviewProps {
  input: CreateShipmentInput;
  modality: ModalityOption;
  carrierName: string;
  onBack: () => void;
}

export function ShipmentConfirmReview({
  input,
  modality,
  carrierName,
  onBack,
}: ShipmentConfirmReviewProps) {
  const createShipment = useCreateShipment();

  return (
    <div className="max-w-2xl">
      <ShipmentSummary
        title="Review and confirm"
        address={input}
        modality={modality}
        carrierName={carrierName}
      >
        <p className="text-[13px] text-muted-foreground">
          We'll check the carrier is still available when you confirm.
        </p>
        <FormError error={createShipment.error} />
        <div className="flex justify-between gap-2.5">
          <Button type="button" variant="secondary" onClick={onBack}>
            Back
          </Button>
          <Button
            onClick={() => createShipment.mutate(input)}
            disabled={createShipment.isPending}
          >
            {createShipment.isPending ? 'Confirming…' : 'Confirm shipment'}
          </Button>
        </div>
      </ShipmentSummary>
    </div>
  );
}
