'use client';

import { DetailRow } from '@/components/common/detail-row';
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
  if (!shipment.ownerId) return { kind: 'claim' };
  if (!canAdvance) return { kind: 'not-authorized' };
  const statuses = ALLOWED_NEXT_STATUSES[shipment.status];
  return statuses.length === 0
    ? { kind: 'terminal' }
    : { kind: 'advance', statuses };
}

export function CarrierShipmentDetail({ id }: { id: string }) {
  const session = useSession();
  const { data: shipment, isLoading } = useQueueShipment(id);
  const claim = useClaimShipment();
  const updateStatus = useUpdateShipmentStatus();
  useShipmentTracking({ shipmentId: id });

  if (isLoading || !shipment) {
    return <div className="text-sm text-muted-foreground">Loading…</div>;
  }

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
