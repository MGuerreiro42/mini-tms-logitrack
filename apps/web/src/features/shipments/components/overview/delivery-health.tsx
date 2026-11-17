import {
  type DeliveryHealth,
  HEALTH_LEVELS,
  type HealthLevel,
  MIN_DELIVERIES,
} from '@/features/shipments/lib/delivery-health';
import { cn } from '@/lib/utils';

// Only the active step is filled, worst (left) to best (right).
const FILL: Record<HealthLevel, string> = {
  Critical: 'bg-sla-late',
  Poor: 'bg-sla-soon',
  Fair: 'bg-status-pending-dot',
  Good: 'bg-status-delivered-dot',
  Excellent: 'bg-status-delivered-fg',
};

export function DeliveryHealthCell({ health }: { health: DeliveryHealth }) {
  if ('building' in health) {
    return (
      <p className="text-[13px]">
        <span className="font-semibold">Building your score</span>
        <span className="text-muted-foreground">
          {' '}
          · {health.building} of {MIN_DELIVERIES} deliveries
        </span>
      </p>
    );
  }
  const step = HEALTH_LEVELS.indexOf(health.level);

  return (
    // The band rule shows on hover; screen readers always read it.
    <div className="group flex flex-col gap-1.5">
      <p className="text-[13px] font-semibold">Delivery health</p>
      <div aria-hidden className="relative w-32 pb-1.5">
        <div className="flex gap-0.5">
          {HEALTH_LEVELS.map((level) => (
            <span
              key={level}
              className={cn(
                'h-1.5 flex-1 rounded-full',
                level === health.level ? FILL[level] : 'bg-muted',
              )}
            />
          ))}
        </div>
        <span
          className="absolute bottom-0 left-0 flex w-1/5 justify-center transition-transform duration-300 ease-enter"
          style={{ transform: `translateX(${step * 100}%)` }}
        >
          <span className="size-0 border-x-4 border-b-4 border-x-transparent border-b-foreground" />
        </span>
      </div>
      <p className="text-[13px]">
        <span className="font-semibold">{health.level}</span>
        {health.heldBackBy && (
          <span className="text-muted-foreground">
            {' '}
            · held back by {health.heldBackBy}
          </span>
        )}
      </p>
      <p className="font-mono text-[11px] text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
        rule: worst of on time, first attempt, returns, cancelled · benchmark,
        not your goal
      </p>
    </div>
  );
}
