import { CheckIcon } from 'lucide-react';
import { ShipmentStatusBadge } from '@/components/ui/status-badge';
import { formatShortDateTime } from '@/lib/format-date';
import {
  HAPPY_PATH,
  isOnHappyPath,
  reachedStepIndex,
} from '@/lib/shipment-progress';
import { SHIPMENT_STATUS_LABEL } from '@/lib/status-labels';
import { cn } from '@/lib/utils';
import type { ShipmentStatus, TimelineEvent } from '@/types/status';

type StepState = 'done' | 'current' | 'upcoming' | 'unreached';

export function ShipmentStepper({
  status,
  events = [],
}: {
  status: ShipmentStatus;
  events?: TimelineEvent[];
}) {
  const reached = reachedStepIndex(status, events);
  // A delivered or off-path shipment has nothing in progress, so every reached step reads as done.
  const current =
    isOnHappyPath(status) && status !== 'DELIVERED' ? reached : -1;
  const ahead: StepState = isOnHappyPath(status) ? 'upcoming' : 'unreached';
  const stateOf = (index: number): StepState =>
    index === current ? 'current' : index <= reached ? 'done' : ahead;
  const reachedAt = (step: ShipmentStatus) =>
    events.find((event) => event.status === step)?.createdAt;

  return (
    <div className="@container space-y-3">
      <ol
        aria-label="Shipment progress"
        className="hidden grid-cols-6 @xl:grid"
      >
        {HAPPY_PATH.map((step, index) => {
          const state = stateOf(index);
          const at = reachedAt(step);
          return (
            <li
              key={step}
              aria-current={state === 'current' ? 'step' : undefined}
              className="flex flex-col gap-2.5"
            >
              <div className="flex items-center">
                <span
                  aria-hidden
                  className={cn(
                    'flex size-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold',
                    state === 'done' || state === 'current'
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-muted bg-muted text-muted-foreground',
                    state === 'current' && 'ring-5 ring-live-halo',
                  )}
                >
                  {state === 'done' ? (
                    <CheckIcon className="size-3.5" />
                  ) : (
                    index + 1
                  )}
                </span>
                {index < HAPPY_PATH.length - 1 && (
                  <span
                    aria-hidden
                    className={cn(
                      'mx-1.5 h-0.5 flex-1',
                      index < reached ? 'bg-primary' : 'bg-border',
                    )}
                  />
                )}
              </div>
              <div className="flex flex-col gap-0.5 pr-3">
                <span
                  className={cn(
                    'text-sm font-semibold',
                    (state === 'upcoming' || state === 'unreached') &&
                      'text-muted-foreground',
                  )}
                >
                  <span className="sr-only">{STEP_STATE_LABEL[state]}: </span>
                  {SHIPMENT_STATUS_LABEL[step]}
                </span>
                {at && (
                  <time dateTime={at} className="text-xs text-muted-foreground">
                    {formatShortDateTime(at)}
                  </time>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      <div className="space-y-2 @xl:hidden">
        <div aria-hidden className="grid grid-cols-6 gap-1.5">
          {HAPPY_PATH.map((step, index) => (
            <span
              key={step}
              className={cn(
                'h-1.5 rounded-full',
                index <= reached ? 'bg-primary' : 'bg-muted',
              )}
            />
          ))}
        </div>
        <p className="flex justify-between text-[13px] text-muted-foreground">
          <span>
            Step {reached + 1} of {HAPPY_PATH.length}
          </span>
          <span className="font-semibold text-foreground">
            {SHIPMENT_STATUS_LABEL[HAPPY_PATH[reached]]}
          </span>
        </p>
      </div>
      {!isOnHappyPath(status) && (
        <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <ShipmentStatusBadge status={status} />
          after {SHIPMENT_STATUS_LABEL[HAPPY_PATH[reached]].toLowerCase()}
        </p>
      )}
    </div>
  );
}

const STEP_STATE_LABEL: Record<StepState, string> = {
  done: 'Done',
  current: 'Current',
  upcoming: 'Upcoming',
  unreached: 'Not reached',
};
