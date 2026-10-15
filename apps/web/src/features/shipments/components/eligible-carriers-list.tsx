'use client';

import { useId, useState } from 'react';
import { EmptyState } from '@/components/common/feedback-state';
import { QuerySkeleton, QueryState } from '@/components/common/query-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useEligibleCarriers } from '../hooks/use-eligible-carriers';
import type { EligibleCarrier, ModalityOption } from '../types';
import {
  modalityLabel,
  ShipmentSummary,
  type SummaryAddress,
} from './shipment-summary';

interface EligibleCarriersListProps {
  address: SummaryAddress;
  modality: ModalityOption;
  defaultCarrierId?: string;
  onBack: () => void;
  onNext: (carrierId: string, carrierName: string) => void;
}

export function EligibleCarriersList({
  address,
  modality,
  defaultCarrierId,
  onBack,
  onNext,
}: EligibleCarriersListProps) {
  const { addressCity: city, addressState: state } = address;
  const query = useEligibleCarriers(state, city, modality.id);
  const [selectedId, setSelectedId] = useState(defaultCarrierId);
  const selected = query.data?.find((carrier) => carrier.id === selectedId);

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <QueryState
        skeleton={<QuerySkeleton />}
        query={query}
        errorMessage="Couldn't load eligible carriers."
      >
        {(carriers) =>
          carriers.length === 0 ? (
            <EmptyState
              title="No compatible carrier"
              description={`No approved carrier covers ${city}/${state} for this modality yet. Go back to try another modality, or check again later.`}
            />
          ) : (
            <fieldset className="flex min-w-0 flex-col gap-3.5">
              <legend className="mb-3.5 text-base font-semibold">
                Choose a carrier · {carriers.length} available
              </legend>
              {carriers.map((carrier) => (
                <CarrierOption
                  key={carrier.id}
                  carrier={carrier}
                  coverage={`${city}, ${state}`}
                  modality={modalityLabel(modality)}
                  selected={carrier.id === selectedId}
                  onSelect={() => setSelectedId(carrier.id)}
                />
              ))}
            </fieldset>
          )
        }
      </QueryState>
      <ShipmentSummary
        title="Summary"
        address={address}
        modality={modality}
        carrierName={selected?.companyName}
      >
        <div className="flex justify-between gap-2.5">
          <Button type="button" variant="secondary" onClick={onBack}>
            Back
          </Button>
          <Button
            type="button"
            disabled={!selected}
            onClick={() =>
              selected && onNext(selected.id, selected.companyName)
            }
          >
            Continue to review
          </Button>
        </div>
      </ShipmentSummary>
    </div>
  );
}

function CarrierOption({
  carrier,
  coverage,
  modality,
  selected,
  onSelect,
}: {
  carrier: EligibleCarrier;
  coverage: string;
  modality: string;
  selected: boolean;
  onSelect: () => void;
}) {
  const id = useId();

  return (
    <label
      className={cn(
        'flex cursor-pointer gap-3.5 rounded-xl bg-card px-5.5 py-5 shadow-panel has-focus-visible:ring-3 has-focus-visible:ring-ring/50',
        selected && 'ring-2 ring-primary',
      )}
    >
      <input
        type="radio"
        name="carrier"
        checked={selected}
        onChange={onSelect}
        aria-labelledby={`${id}-name`}
        aria-describedby={`${id}-facts`}
        className="mt-1 size-4.5 shrink-0 accent-primary outline-none"
      />
      <span className="flex min-w-0 flex-1 flex-col gap-2.5">
        <span className="flex items-center justify-between gap-3">
          <span id={`${id}-name`} className="text-[17px] font-semibold">
            {carrier.companyName}
          </span>
          <Badge
            aria-hidden
            variant="plain"
            className={
              selected
                ? 'bg-selected text-primary'
                : 'bg-muted text-muted-foreground'
            }
          >
            {selected ? 'Selected' : 'Available'}
          </Badge>
        </span>
        <span
          id={`${id}-facts`}
          className="grid gap-3 text-[13px] sm:grid-cols-2"
        >
          <CarrierFact label="Covers" value={coverage} />{' '}
          <CarrierFact label="Modality" value={modality} />
        </span>
      </span>
    </label>
  );
}

function CarrierFact({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex flex-col gap-0.75">
      <span className="text-muted-foreground">{label}</span>{' '}
      <span className="font-semibold">{value}</span>
    </span>
  );
}
