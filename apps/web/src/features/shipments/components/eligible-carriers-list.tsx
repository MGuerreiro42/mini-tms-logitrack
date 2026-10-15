'use client';

import { useState } from 'react';
import { QueryState } from '@/components/common/query-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useEligibleCarriers } from '../hooks/use-eligible-carriers';
import type { EligibleCarrier } from '../types';

interface EligibleCarriersListProps {
  state: string;
  city: string;
  modalityId: string;
  defaultCarrierId?: string;
  onBack: () => void;
  onNext: (carrierId: string, carrierName: string) => void;
}

export function EligibleCarriersList({
  state,
  city,
  modalityId,
  defaultCarrierId,
  onBack,
  onNext,
}: EligibleCarriersListProps) {
  const query = useEligibleCarriers(state, city, modalityId);
  const [selectedId, setSelectedId] = useState(defaultCarrierId);
  const selected = query.data?.find((carrier) => carrier.id === selectedId);

  return (
    <Card className="max-w-xl">
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-sm">Eligible carriers</CardTitle>
        {query.data && (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
            {query.data.length} match{query.data.length === 1 ? '' : 'es'}
          </span>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Approved carriers covering this destination and modality.
        </p>
        <QueryState
          query={query}
          errorMessage="Couldn't load eligible carriers."
        >
          {(carriers) =>
            carriers.length === 0 ? (
              <NoCarrierState city={city} state={state} />
            ) : (
              <div className="space-y-2">
                {carriers.map((carrier) => (
                  <CarrierOption
                    key={carrier.id}
                    carrier={carrier}
                    selected={carrier.id === selectedId}
                    onSelect={() => setSelectedId(carrier.id)}
                  />
                ))}
              </div>
            )
          }
        </QueryState>
        <div className="flex justify-between gap-2">
          <Button type="button" variant="outline" onClick={onBack}>
            ← Back
          </Button>
          <Button
            type="button"
            disabled={!selected}
            onClick={() =>
              selected && onNext(selected.id, selected.companyName)
            }
          >
            Continue
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function CarrierOption({
  carrier,
  selected,
  onSelect,
}: {
  carrier: EligibleCarrier;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        'flex w-full items-center gap-3 rounded-md border px-3 py-3 text-left hover:border-primary hover:bg-primary/5',
        selected && 'border-primary bg-primary/5 ring-1 ring-primary',
      )}
    >
      <div className="flex size-9 items-center justify-center rounded-md bg-muted text-xs font-semibold">
        {carrier.companyName.slice(0, 2).toUpperCase()}
      </div>
      <span className="text-sm font-semibold">{carrier.companyName}</span>
    </button>
  );
}

// The key exception in this flow, so it gets more weight than a plain message.
function NoCarrierState({ city, state }: { city: string; state: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-md border border-dashed py-8 text-center">
      <div className="text-2xl">⚠</div>
      <p className="text-sm font-semibold">No compatible carrier</p>
      <p className="max-w-xs text-xs text-muted-foreground">
        No approved carrier covers {city}/{state} for this modality yet. Try
        another modality or check back later.
      </p>
    </div>
  );
}
