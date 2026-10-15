'use client';

import { type ReactNode, useEffect, useId, useRef, useState } from 'react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { DetailRow } from '@/components/common/detail-row';
import { QueryState } from '@/components/common/query-state';
import { ShipmentStepper } from '@/components/common/shipment-stepper';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSession } from '@/hooks/use-session';
import type { LiveStatus } from '@/lib/live-status';
import { SHIPMENT_STATUS } from '@/lib/status-colors';
import { cn } from '@/lib/utils';
import { useClaimShipment } from '../hooks/use-claim-shipment';
import { useQueueShipment } from '../hooks/use-queue-shipment';
import { useShipmentTracking } from '../hooks/use-shipment-tracking';
import { useUpdateShipmentStatus } from '../hooks/use-update-shipment-status';
import {
  ALLOWED_NEXT_STATUSES,
  type CarrierShipment,
  isClaimable,
  type ShipmentStatus,
  TRACKING_NOTE_MAX_LENGTH,
} from '../types';
import {
  ShipmentAddressRows,
  ShipmentDueLine,
  ShipmentTimelineCard,
  ShipmentTitle,
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
  const session = useSession();
  const isOwner = shipment.ownerEmail === session?.email;
  const canAdvance = session?.role === 'CARRIER_MANAGER' || isOwner;
  useCancelledNotice(shipment.status, isOwner);
  const actionState = getActionState(shipment, canAdvance);
  const hasPinnedAction =
    actionState.kind === 'claim' || actionState.kind === 'advance';

  return (
    <div
      className={cn('flex flex-col gap-5', hasPinnedAction && 'max-lg:pb-20')}
    >
      <ShipmentTitle
        shipment={shipment}
        liveStatus={liveStatus}
        back={{ href: '/carrier/queue', label: 'Queue' }}
        meta={ownerMeta(shipment, isOwner)}
      >
        <ShipmentDueLine shipment={shipment} />
      </ShipmentTitle>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-start">
        <div className="flex flex-col gap-5">
          <NextStep shipment={shipment} actionState={actionState} />
          <Card>
            <CardHeader>
              <CardTitle>Delivery</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="pb-3">
                <ShipmentStepper
                  status={shipment.status}
                  events={shipment.trackingEvents}
                />
              </div>
              <ShipmentAddressRows address={shipment} />
              <DetailRow label="Seller" value={shipment.sellerCompanyName} />
              <DetailRow label="Seller contact" value={shipment.sellerEmail} />
            </CardContent>
          </Card>
        </div>
        <ShipmentTimelineCard
          events={shipment.trackingEvents}
          status={shipment.status}
        />
      </div>
    </div>
  );
}

function ownerMeta(
  shipment: CarrierShipment,
  isOwner: boolean,
): string | undefined {
  if (isOwner) return 'Owned by you';
  if (shipment.ownerEmail) return `Owned by ${shipment.ownerEmail}`;
  return isClaimable(shipment) ? 'Unclaimed' : undefined;
}

// Same element on both layouts.
const PINNED =
  'lg:ml-auto max-lg:fixed max-lg:inset-x-4 max-lg:bottom-[calc(--spacing(16)+max(--spacing(2),env(safe-area-inset-bottom)))] max-lg:z-30 max-lg:h-12 max-lg:shadow-panel';
const INVERSE =
  'lg:bg-primary-inverse lg:text-primary-inverse-foreground lg:hover:bg-primary-inverse/85 lg:focus-visible:ring-primary-inverse/60 lg:disabled:bg-emphasis-foreground/15 lg:disabled:text-emphasis-foreground/70 lg:disabled:opacity-100';

interface StepCopy {
  title: string;
  description?: string;
}

function NextStep({
  shipment,
  actionState,
}: {
  shipment: CarrierShipment;
  actionState: ActionState;
}) {
  const { id, status } = shipment;
  const claim = useClaimShipment();
  const updateStatus = useUpdateShipmentStatus();
  const setBack = useUpdateShipmentStatus('inline');
  const [draft, setDraft] = useState({ status, note: '' });
  const note = draft.status === status ? draft.note : '';
  const noteInput = note.trim() || undefined;
  const isUpdating = updateStatus.isPending || setBack.isPending;

  const nextStatuses =
    actionState.kind === 'advance' ? actionState.statuses : [];
  const primary =
    nextStatuses.find((next) => !isSetback(next)) ?? nextStatuses[0];
  const advance = primary && !isSetback(primary) ? primary : undefined;
  const setbackStep = primary && isSetback(primary) ? primary : undefined;

  let copy: StepCopy;
  let action: ReactNode = null;
  if (actionState.kind === 'claim') {
    copy = {
      title: 'Claim this shipment',
      description:
        'Claiming makes it yours to move through pickup and delivery.',
    };
    action = (
      <Button
        size="lg"
        data-pinned-action
        className={cn(PINNED, INVERSE)}
        onClick={() => claim.mutate(id)}
        disabled={claim.isPending}
      >
        {claim.isPending ? 'Claiming…' : 'Claim shipment'}
      </Button>
    );
  } else if (advance) {
    const label = SHIPMENT_STATUS[advance].label;
    copy = { title: `Mark as ${label.toLowerCase()}` };
    action = (
      <Button
        size="lg"
        data-pinned-action
        className={cn(PINNED, INVERSE)}
        onClick={() =>
          updateStatus.mutate({ id, status: advance, note: noteInput })
        }
        disabled={isUpdating}
      >
        Advance to {label.toLowerCase()}
      </Button>
    );
  } else if (setbackStep) {
    copy = {
      title: SETBACKS[setbackStep].action,
      description: SETBACKS[setbackStep].description,
    };
  } else if (actionState.kind === 'not-authorized') {
    copy = {
      title: 'Waiting on the owner',
      description:
        "Only the owner or the carrier manager can advance this shipment's status.",
    };
  } else {
    copy = {
      title: 'Nothing left to do',
      description: `This shipment is ${SHIPMENT_STATUS[status].label.toLowerCase()}. No further action available.`,
    };
  }

  const strong = primary !== undefined || actionState.kind === 'claim';
  const quiet = strong
    ? 'text-emphasis-foreground/70'
    : 'text-muted-foreground';

  // Stable slot keeps an open dialog mounted.
  return (
    <section
      aria-label="Next step"
      className={cn(
        'flex flex-col gap-4 rounded-xl px-6 py-5.5 shadow-panel',
        strong ? 'bg-emphasis text-emphasis-foreground' : 'bg-card',
      )}
    >
      <div className="flex flex-col gap-1">
        <p className={cn('text-sm', quiet)}>Next step</p>
        <h2 className="text-2xl font-semibold tracking-tight">{copy.title}</h2>
        {copy.description && (
          <p className={cn('max-w-[65ch] text-[15px]', quiet)}>
            {copy.description}
          </p>
        )}
      </div>
      {primary && (
        <NoteField
          value={note}
          onChange={(next) => setDraft({ status, note: next })}
        />
      )}
      <div className="flex flex-wrap items-center gap-2 empty:hidden">
        {SETBACK_STATUSES.map((setback) => (
          <SetbackAction
            key={setback}
            status={setback}
            available={nextStatuses.includes(setback)}
            onConfirm={() =>
              setBack.mutateAsync({ id, status: setback, note: noteInput })
            }
            isPending={isUpdating}
            pinned={setback === setbackStep}
          />
        ))}
        {action}
      </div>
    </section>
  );
}

function NoteField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const id = useId();

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3 text-sm text-emphasis-foreground/70">
        <label htmlFor={id}>Note for the seller, optional</label>
        <span aria-hidden>
          {value.length} / {TRACKING_NOTE_MAX_LENGTH}
        </span>
      </div>
      <textarea
        id={id}
        rows={2}
        value={value}
        maxLength={TRACKING_NOTE_MAX_LENGTH}
        onChange={(event) => onChange(event.target.value)}
        className="resize-none rounded-md bg-emphasis-foreground/10 px-3 py-2.5 text-[15px] text-emphasis-foreground outline-none focus-visible:ring-3 focus-visible:ring-primary-inverse/60"
      />
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
    action: 'Report failed delivery',
    title: 'Mark delivery as failed?',
    description:
      'The seller and the public tracking page will show that this delivery attempt failed.',
  },
  RETURNED: {
    action: 'Return to the seller',
    title: 'Return this shipment to the seller?',
    description: "This closes the shipment as returned and can't be undone.",
  },
} satisfies Partial<
  Record<ShipmentStatus, { action: string; title: string; description: string }>
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
  pinned,
}: {
  status: Setback;
  available: boolean;
  onConfirm: () => Promise<unknown>;
  isPending: boolean;
  pinned: boolean;
}) {
  const { action, title, description } = SETBACKS[status];

  return (
    <ConfirmDialog
      trigger={
        <Button
          variant="destructive"
          size={pinned ? 'lg' : 'default'}
          className={pinned ? PINNED : undefined}
          data-pinned-action={pinned || undefined}
          disabled={isPending}
        >
          {action}
        </Button>
      }
      title={title}
      description={description}
      confirmLabel={action}
      variant="destructive"
      onConfirm={onConfirm}
      available={available}
      unavailableMessage="This shipment has moved on, so this step no longer applies."
    />
  );
}
