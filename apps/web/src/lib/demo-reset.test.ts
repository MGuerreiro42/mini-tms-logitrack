import { toast } from 'sonner';
import { getQueryClient } from '@/lib/query-client';
import { DEMO_RESET_EVENT, handleDemoReset } from './demo-reset';

vi.mock('sonner', () => ({ toast: vi.fn() }));

describe('handleDemoReset', () => {
  it('refetches every query and shows a single notice', () => {
    const invalidate = vi.spyOn(getQueryClient(), 'invalidateQueries');

    handleDemoReset();
    handleDemoReset();

    expect(invalidate).toHaveBeenCalledTimes(2);
    expect(toast).toHaveBeenCalledWith('Demo data was reset', {
      id: DEMO_RESET_EVENT,
    });
  });
});
