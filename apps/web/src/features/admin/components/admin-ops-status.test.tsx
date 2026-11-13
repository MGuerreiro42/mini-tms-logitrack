import { render, screen } from '@testing-library/react';
import { useDemoStatus } from '@/features/demo/hooks/use-demo-status';
import { usePulse } from '../hooks/use-pulse';
import { AdminOpsStatus } from './admin-ops-status';

vi.mock('../hooks/use-pulse', () => ({ usePulse: vi.fn() }));
vi.mock('@/features/demo/hooks/use-demo-status', () => ({
  useDemoStatus: vi.fn(),
}));

describe('AdminOpsStatus', () => {
  beforeEach(() => {
    vi.mocked(useDemoStatus).mockReturnValue({ data: undefined } as never);
  });

  it('shows the simulator and webhooks from the pulse', () => {
    vi.mocked(usePulse).mockReturnValue({
      data: { simulator: 'running', webhooks: { n: 500, successRate: 98.43 } },
    } as never);
    render(<AdminOpsStatus />);

    expect(screen.getByText('Simulator · running')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Webhooks · 98.4% · n 500' }),
    ).toHaveAttribute('href', '/admin/monitoring');
  });

  it('reads unavailable for a null part', () => {
    vi.mocked(usePulse).mockReturnValue({
      data: { simulator: null, webhooks: null },
    } as never);
    render(<AdminOpsStatus />);

    expect(screen.getByText('Simulator · unavailable')).toBeInTheDocument();
    expect(screen.getByText('Webhooks · unavailable')).toBeInTheDocument();
  });
});
