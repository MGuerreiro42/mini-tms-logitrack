'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ApiError } from '@/services/api-client';
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
          <Row
            label="Destination"
            value={`${input.addressStreet}, ${input.addressNumber}`}
          />
          <Row
            label="City"
            value={`${input.addressCity}/${input.addressState}`}
          />
          <Row label="Modality" value={modalityName} />
          <Row label="Carrier" value={carrierName} />
        </div>
        <p className="text-xs text-muted-foreground">
          Everything above is re-validated server-side on confirm — if the
          seller, modality, or carrier eligibility changed since the previous
          step, this will fail with a clear reason instead of silently
          succeeding.
        </p>
        {createShipment.isError && (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {createShipment.error instanceof ApiError
              ? createShipment.error.message
              : 'Something went wrong.'}
          </p>
        )}
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b py-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
