'use client';

import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { DetailRow } from '@/components/common/detail-row';
import { QueryState } from '@/components/common/query-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSession } from '@/hooks/use-session';
import type { LiveStatus } from '@/lib/live-status';
import { SHIPMENT_STATUS } from '@/lib/status-colors';
import { useClaimShipment } from '../hooks/use-claim-shipment';
import { useQueueShipment } from '../hooks/use-queue-shipment';
import { useShipmentTracking } from '../hooks/use-shipment-tracking';
import { useUpdateShipmentStatus } from '../hooks/use-update-shipment-status';
import {
  ALLOWED_NEXT_STATUSES,
  type CarrierShipment,
  isClaimable,
  ownerLabel,
  type ShipmentStatus,
} from '../types';
import {
  ShipmentAddressRows,
  ShipmentHeaderCard,
  ShipmentTimelineCard,
} from './shipment-detail-parts';

type ActionState =
  | { kind: 'claim' }
  | { kind: 'advance'; statuses: ShipmentStatus[] }
  | { kind: 'terminal' }
  | { kind: 'not-authorized' };

function getActionState(
  shipment: CarrierShipment,
  canAdvance: boolean,
): ActionState {
  if (isClaimable(shipment)) return { kind: 'claim' };
  const statuses = ALLOWED_NEXT_STATUSES[shipment.status];
  if (statuses.length === 0) return { kind: 'terminal' };
  if (!canAdvance) return { kind: 'not-authorized' };
  return { kind: 'advance', statuses };
}

export function CarrierShipmentDetail({ id }: { id: string }) {
  const liveStatus = useShipmentTracking({ shipmentId: id });
  const query = useQueueShipment(id, liveStatus);

  return (
    <QueryState
      query={query}
      errorMessage="Couldn't load this shipment."
      notFoundMessage="Shipment not found."
    >
      {(shipment) => (
        <CarrierShipmentView shipment={shipment} liveStatus={liveStatus} />
      )}
    </QueryState>
  );
}

function CarrierShipmentView({
  shipment,
  liveStatus,
}: {
  shipment: CarrierShipment;
  liveStatus: LiveStatus;
}) {
  const { id } = shipment;
  const session = useSession();
  const claim = useClaimShipment();
  const updateStatus = useUpdateShipmentStatus();

  const isOwner = shipment.ownerEmail === session?.email;
  const canAdvance = session?.role === 'CARRIER_MANAGER' || isOwner;
  useCancelledNotice(shipment.status, isOwner);
  const actionState = getActionState(shipment, canAdvance);
  const nextStatuses =
    actionState.kind === 'advance' ? actionState.statuses : [];

  return (
    <div className="grid gap-4 md:grid-cols-[1fr_300px]">
      <ShipmentHeaderCard shipment={shipment} liveStatus={liveStatus}>
        <DetailRow label="Seller" value={shipment.sellerCompanyName} />
        <DetailRow label="Seller contact" value={shipment.sellerEmail} />
        <DetailRow label="Modality" value={shipment.modalityName} />
        <ShipmentAddressRows address={shipment} />
        <DetailRow label="Owner" value={ownerLabel(shipment)} />
      </ShipmentHeaderCard>
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {actionState.kind === 'claim' && (
              <Button
                className="w-full"
                onClick={() => claim.mutate(id)}
                disabled={claim.isPending}
              >
                {claim.isPending ? 'Claiming…' : 'Claim shipment'}
              </Button>
            )}
            {nextStatuses
              .filter((next) => !isSetback(next))
              .map((next) => (
                <Button
                  key={next}
                  variant="outline"
                  className="w-full"
                  onClick={() => updateStatus.mutate({ id, status: next })}
                  disabled={updateStatus.isPending}
                >
                  Advance to {SHIPMENT_STATUS[next].label}
                </Button>
              ))}
            {SETBACK_STATUSES.map((setback) => (
              <SetbackAction
                key={setback}
                status={setback}
                available={nextStatuses.includes(setback)}
                onConfirm={() =>
                  updateStatus.mutateAsync({ id, status: setback })
                }
                isPending={updateStatus.isPending}
              />
            ))}
            {actionState.kind === 'terminal' && (
              <p className="text-xs text-muted-foreground">
                No further action available.
              </p>
            )}
            {actionState.kind === 'not-authorized' && (
              <p className="text-xs text-muted-foreground">
                Only the owner or the carrier manager can advance this
                shipment's status.
              </p>
            )}
          </CardContent>
        </Card>
        <ShipmentTimelineCard events={shipment.trackingEvents} />
      </div>
    </div>
  );
}

function useCancelledNotice(status: ShipmentStatus, isOwner: boolean): void {
  const previous = useRef({ status, isOwner });

  useEffect(() => {
    const before = previous.current;
    previous.current = { status, isOwner };
    if (status === 'CANCELLED' && before.status !== status && before.isOwner) {
      toast.info('The seller cancelled this shipment.');
    }
  }, [status, isOwner]);
}

const SETBACKS = {
  FAILED_DELIVERY: {
    title: 'Mark delivery as failed?',
    description:
      'The seller and the public tracking page will show that this delivery attempt failed.',
  },
  RETURNED: {
    title: 'Return this shipment to the seller?',
    description: "This closes the shipment as returned and can't be undone.",
  },
} satisfies Partial<
  Record<ShipmentStatus, { title: string; description: string }>
>;

type Setback = keyof typeof SETBACKS;

const SETBACK_STATUSES = Object.keys(SETBACKS) as Setback[];

function isSetback(status: ShipmentStatus): status is Setback {
  return status in SETBACKS;
}

function SetbackAction({
  status,
  available,
  onConfirm,
  isPending,
}: {
  status: Setback;
  available: boolean;
  onConfirm: () => Promise<unknown>;
  isPending: boolean;
}) {
  const label = SHIPMENT_STATUS[status].label;

  return (
    <ConfirmDialog
      trigger={
        <Button variant="destructive" className="w-full" disabled={isPending}>
          {label}
        </Button>
      }
      title={SETBACKS[status].title}
      description={SETBACKS[status].description}
      confirmLabel={label}
      variant="destructive"
      onConfirm={onConfirm}
      available={available}
      unavailableMessage="This shipment has moved on, so this step no longer applies."
    />
  );
}
