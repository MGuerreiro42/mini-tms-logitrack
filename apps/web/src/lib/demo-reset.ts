import { toast } from 'sonner';
import { getQueryClient } from '@/lib/query-client';

export const DEMO_RESET_EVENT = 'demo:reset';

// The fixed id keeps it to one notice if a page holds both sockets.
export function handleDemoReset(): void {
  void getQueryClient().invalidateQueries();
  toast('Demo data was reset', { id: DEMO_RESET_EVENT });
}
