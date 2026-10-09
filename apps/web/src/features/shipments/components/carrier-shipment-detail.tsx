'use client';

import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { DetailRow } from '@/components/common/detail-row';
import { LiveIndicator } from '@/components/common/live-indicator';
import { QueryState } from '@/components/common/query-state';
import { TrackingTimeline } from '@/components/common/tracking-timeline';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShipmentStatusPill } from '@/components/ui/status-pill';
import { useSession } from '@/hooks/use-session';
import { SHIPMENT_STATUS } from '@/lib/status-colors';
import { useClaimShipment } from '../hooks/use-claim-shipment';
import { useQueueShipment } from '../hooks/use-queue-shipment';
import { useShipmentTracking } from '../hooks/use-shipment-tracking';
import { useUpdateShipmentStatus } from '../hooks/use-update-shipment-status';
import {
  ALLOWED_NEXT_STATUSES,
  type CarrierShipment,
  isClaimable,
  type ShipmentStatus,
} from '../types';

// The three action-card states (claim / advance / explanatory message) are
// mutually exclusive by construction here, computed once, rather than each
// JSX branch re-deriving `ownerId`/`canAdvance`/`nextStatuses.length`
// independently — a render bug in one branch's condition can't silently
// make two branches (or zero) match at once.
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
  const query = useQueueShipment(id);
  useShipmentTracking({ shipmentId: id });

  return (
    <QueryState
      query={query}
      errorMessage="Couldn't load this shipment."
      notFoundMessage="Shipment not found."
    >
      {(shipment) => <CarrierShipmentView shipment={shipment} />}
    </QueryState>
  );
}

function CarrierShipmentView({ shipment }: { shipment: CarrierShipment }) {
  const { id } = shipment;
  const session = useSession();
  const claim = useClaimShipment();
  const updateStatus = useUpdateShipmentStatus();

  // The owner can always act on their own shipment; a manager can act on any
  // shipment in the carrier to unblock operations (DESIGN.md § 3) — a
  // non-owning operator sees the actions but the backend would 403 them, so
  // hide the control instead of offering an action that's guaranteed to fail.
  const canAdvance =
    session?.role === 'CARRIER_MANAGER' ||
    shipment.ownerEmail === session?.email;
  const actionState = getActionState(shipment, canAdvance);

  return (
    <div className="grid gap-4 md:grid-cols-[1fr_300px]">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            {shipment.trackingCode}
            <ShipmentStatusPill status={shipment.status} />
            <LiveIndicator className="ml-auto" />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <DetailRow label="Seller" value={shipment.sellerCompanyName} />
          <DetailRow label="Seller contact" value={shipment.sellerEmail} />
          <DetailRow label="Modality" value={shipment.modalityName} />
          <DetailRow
            label="Address"
            value={`${shipment.addressStreet}, ${shipment.addressNumber}`}
          />
          <DetailRow
            label="Neighborhood"
            value={shipment.addressNeighborhood}
          />
          <DetailRow
            label="City"
            value={`${shipment.addressCity}/${shipment.addressState}`}
          />
          <DetailRow label="Zip code" value={shipment.addressZipCode} mono />
          <DetailRow label="Owner" value={shipment.ownerEmail ?? 'Unclaimed'} />
        </CardContent>
      </Card>
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
            {actionState.kind === 'advance' &&
              actionState.statuses.map((next) => (
                <AdvanceStatusButton
                  key={next}
                  status={next}
                  onAdvance={() => updateStatus.mutate({ id, status: next })}
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
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Tracking</CardTitle>
          </CardHeader>
          <CardContent>
            <TrackingTimeline events={shipment.trackingEvents ?? []} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

const SETBACK_CONFIRMATION: Partial<
  Record<ShipmentStatus, { title: string; description: string }>
> = {
  FAILED_DELIVERY: {
    title: 'Mark delivery as failed?',
    description:
      'The seller and the public tracking page will show that this delivery attempt failed.',
  },
  RETURNED: {
    title: 'Return this shipment to the seller?',
    description: "This closes the shipment as returned and can't be undone.",
  },
};

function AdvanceStatusButton({
  status,
  onAdvance,
  isPending,
}: {
  status: ShipmentStatus;
  onAdvance: () => void;
  isPending: boolean;
}) {
  const label = SHIPMENT_STATUS[status].label;
  const confirmation = SETBACK_CONFIRMATION[status];

  if (!confirmation) {
    return (
      <Button
        variant="outline"
        className="w-full"
        onClick={onAdvance}
        disabled={isPending}
      >
        Advance to {label}
      </Button>
    );
  }

  return (
    <ConfirmDialog
      trigger={
        <Button variant="destructive" className="w-full" disabled={isPending}>
          {label}
        </Button>
      }
      title={confirmation.title}
      description={confirmation.description}
      confirmLabel={label}
      variant="destructive"
      onConfirm={onAdvance}
      isConfirming={isPending}
    />
  );
}
