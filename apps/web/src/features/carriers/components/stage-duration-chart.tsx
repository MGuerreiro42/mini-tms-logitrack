import { StageChart } from '@/components/common/charts/stage-chart';
import { Panel } from '@/components/common/panel';
import type { ShipmentStatus } from '@/types/status';
import type { StageDuration } from '../types';

// Each stage is named by the status the shipment sits in (spec 07 FR-016).
const STAGE_LABEL: Partial<Record<ShipmentStatus, string>> = {
  PENDING: 'Claim wait',
  ACCEPTED: 'Pickup wait',
  COLLECTED: 'At origin',
  IN_TRANSIT: 'Line haul',
  OUT_FOR_DELIVERY: 'Last mile',
};

export function StageDurationChart({ stages }: { stages: StageDuration[] }) {
  return (
    <Panel
      title="Time per stage"
      description="Budgets are shares of the median SLA"
      isEmpty={stages.every((stage) => stage.n === 0)}
      emptyMessage="Not enough data yet. Stages fill in as shipments move through them."
    >
      <StageChart
        rows={stages.map((stage) => ({
          ...stage,
          key: stage.status,
          label: STAGE_LABEL[stage.status] ?? stage.status,
        }))}
      />
    </Panel>
  );
}
