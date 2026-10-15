import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { reconnectSockets } from '@/services/websocket-client';
import { LiveIndicator, OfflineBanner } from './live-indicator';

vi.mock('@/services/websocket-client', () => ({
  reconnectSockets: vi.fn(() => new Promise(() => {})),
}));

describe('LiveIndicator', () => {
  it.each([
    ['connecting', 'Connecting…'],
    ['live', 'Live'],
    ['offline', 'Offline'],
  ] as const)('labels the %s state', (status, label) => {
    render(<LiveIndicator status={status} />);
    expect(screen.getByRole('status')).toHaveTextContent(label);
  });

  it('keeps the live detail outside the status region', () => {
    render(
      <LiveIndicator status="live" detail="2 updates in the last minute" />,
    );

    expect(screen.getByRole('status')).toHaveTextContent(/^Live$/);
    expect(
      screen.getByText('· 2 updates in the last minute'),
    ).toBeInTheDocument();
  });
});

describe('OfflineBanner', () => {
  it.each([
    'connecting',
    'live',
  ] as const)('stays hidden while %s', (status) => {
    const { container } = render(<OfflineBanner status={status} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('explains the pause and reconnects on demand', async () => {
    const user = userEvent.setup();
    render(<OfflineBanner status="offline" />);

    expect(screen.getByText(/live updates paused/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Reconnect' }));
    await user.click(screen.getByRole('button', { name: 'Reconnecting…' }));

    expect(reconnectSockets).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole('button', { name: 'Reconnecting…' }),
    ).toBeDisabled();
  });
});
