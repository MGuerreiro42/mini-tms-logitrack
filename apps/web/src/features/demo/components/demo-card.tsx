'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { Panel } from '@/components/common/panel';
import { Button } from '@/components/ui/button';
import { useNow } from '@/hooks/use-now';
import { formatTime, formatWeekdayTime } from '@/lib/format-date';
import { HTTP_STATUS } from '@/lib/http-status';
import { cn } from '@/lib/utils';
import { ApiError, hasStatus } from '@/services/api-client';
import { demoKeys } from '../api';
import { useAdminDemo, useResetDemo } from '../hooks/use-admin-demo';
import { ChaosControls } from './chaos-controls';

const TICK_MS = 1_000;
const RESET_TOO_SOON =
  'The demo was reset a moment ago. Try again in a minute.';

// Absent wherever the API runs without the simulator (GET /admin/demo answers 404).
export function DemoCard({ simulator }: { simulator: string }) {
  const { data } = useAdminDemo();
  const reset = useResetDemo();
  const queryClient = useQueryClient();
  const now = useNow(TICK_MS).getTime();
  // Past its end but not yet ended on the server: the card says Ending… and refetches.
  const ending = !!data?.chaos && Date.parse(data.chaos.endsAt) <= now;
  useEffect(() => {
    if (ending)
      void queryClient.invalidateQueries({ queryKey: demoKeys.admin() });
  }, [ending, queryClient]);
  if (!data) return null;

  const resetDemo = () =>
    reset.mutateAsync().catch((error: unknown) => {
      throw hasStatus(error, HTTP_STATUS.TOO_MANY_REQUESTS)
        ? new ApiError(error.statusCode, RESET_TOO_SOON)
        : error;
    });

  return (
    <Panel
      title="Demo"
      description="Demo deployment only"
      className={cn('gap-3', data.chaos && 'ring-2 ring-warning')}
    >
      <dl className="flex gap-2 text-[13px]">
        <dt className="text-muted-foreground">Simulator</dt>
        <dd className="font-semibold">{simulator}</dd>
      </dl>
      <p className="text-[13px] text-muted-foreground">
        Resets daily at 04:00 · last reset{' '}
        {data.lastResetAt ? formatTime(data.lastResetAt) : 'never'}
        {data.nextResetAt && ` · next ${formatWeekdayTime(data.nextResetAt)}`}
      </p>
      <ConfirmDialog
        trigger={
          <Button variant="destructive" className="w-fit">
            Reset demo data…
          </Button>
        }
        title="Reset the demo data?"
        description="This deletes the demo sellers' shipments, tracking history and webhook log, restores the seeded shipments and ends any running scenario. Other accounts and signups are kept."
        confirmLabel="Reset demo data"
        variant="destructive"
        onConfirm={resetDemo}
      />
      <ChaosControls demo={data} now={now} />
    </Panel>
  );
}
