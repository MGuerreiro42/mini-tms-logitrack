'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useEligibleCarriers } from '../hooks/use-eligible-carriers';

interface EligibleCarriersListProps {
  state: string;
  city: string;
  modalityId: string;
  onBack: () => void;
  onNext: (carrierId: string, carrierName: string) => void;
}

export function EligibleCarriersList({
  state,
  city,
  modalityId,
  onBack,
  onNext,
}: EligibleCarriersListProps) {
  const { data: carriers, isLoading } = useEligibleCarriers(
    state,
    city,
    modalityId,
  );

  return (
    <Card className="max-w-xl">
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-sm">Eligible carriers</CardTitle>
        {carriers && (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
            {carriers.length} match{carriers.length === 1 ? '' : 'es'}
          </span>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Cross-references coverage (city/state) × modality × approval status.
        </p>
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {/* Empty state — the single most important exception in this whole
            flow, per FLOW.md — gets real visual weight, not a generic error. */}
        {!isLoading && carriers?.length === 0 && (
          <div className="flex flex-col items-center gap-2 rounded-md border border-dashed py-8 text-center">
            <div className="text-2xl">⚠</div>
            <p className="text-sm font-semibold">No compatible carrier</p>
            <p className="max-w-xs text-xs text-muted-foreground">
              No approved carrier covers {city}/{state} for this modality yet.
              Try another modality or check back later.
            </p>
          </div>
        )}
        {carriers?.map((carrier) => (
          <button
            key={carrier.id}
            type="button"
            onClick={() => onNext(carrier.id, carrier.companyName)}
            className="flex w-full items-center gap-3 rounded-md border px-3 py-3 text-left hover:border-primary hover:bg-primary/5"
          >
            <div className="flex size-9 items-center justify-center rounded-md bg-muted text-xs font-semibold">
              {carrier.companyName.slice(0, 2).toUpperCase()}
            </div>
            <span className="text-sm font-semibold">{carrier.companyName}</span>
          </button>
        ))}
        <Button type="button" variant="outline" onClick={onBack}>
          ← Back
        </Button>
      </CardContent>
    </Card>
  );
}
