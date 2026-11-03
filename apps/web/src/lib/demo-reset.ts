import { toast } from 'sonner';
import { getQueryClient } from '@/lib/query-client';

export const DEMO_RESET_EVENT = 'demo:reset';

// Both sockets receive the event; the toast id keeps it to a single notice.
export function handleDemoReset(): void {
  void getQueryClient().invalidateQueries();
  toast('Demo data was reset', { id: DEMO_RESET_EVENT });
}
