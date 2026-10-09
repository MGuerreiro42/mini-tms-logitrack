'use client';

import { DetailRow } from '@/components/common/detail-row';
import { FormError } from '@/components/common/form-error';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCreateShipment } from '../hooks/use-create-shipment';
import type { CreateShipmentInput } from '../types';

interface ShipmentConfirmReviewProps {
  input: CreateShipmentInput;
  modalityName: string;
  carrierName: string;
  onBack: () => void;
}

export function ShipmentConfirmReview({
  input,
  modalityName,
  carrierName,
  onBack,
}: ShipmentConfirmReviewProps) {
  const createShipment = useCreateShipment();

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle className="text-sm">Review and confirm</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 text-sm">
          <DetailRow
            label="Destination"
            value={`${input.addressStreet}, ${input.addressNumber}`}
          />
          <DetailRow
            label="City"
            value={`${input.addressCity}/${input.addressState}`}
          />
          <DetailRow label="Modality" value={modalityName} />
          <DetailRow label="Carrier" value={carrierName} />
        </div>
        <p className="text-xs text-muted-foreground">
          We'll check the carrier is still available when you confirm.
        </p>
        <FormError error={createShipment.error} />
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onBack}>
            ← Back
          </Button>
          <Button
            onClick={() => createShipment.mutate(input)}
            disabled={createShipment.isPending}
          >
            {createShipment.isPending ? 'Confirming…' : 'Confirm shipment'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
