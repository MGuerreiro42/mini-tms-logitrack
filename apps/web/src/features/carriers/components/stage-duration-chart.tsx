import { StageChart } from '@/components/common/charts/stage-chart';
import { Panel } from '@/components/common/panel';
import { STAGE_LABEL, type StageDuration } from '@/lib/metrics';

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
