import { act, render, screen } from '@testing-library/react';
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
    render(<LiveIndicator live={{ status, lastEventAt: null }} />);
    expect(screen.getByRole('status')).toHaveTextContent(label);
  });

  it('keeps the live detail outside the status region', () => {
    render(
      <LiveIndicator
        live={{ status: 'live', lastEventAt: null }}
        detail="2 updates in the last minute"
      />,
    );

    expect(screen.getByRole('status')).toHaveTextContent(/^Live$/);
    expect(
      screen.getByText('· 2 updates in the last minute'),
    ).toBeInTheDocument();
  });
});

describe('LiveIndicator live behavior', () => {
  afterEach(() => vi.useRealTimers());

  it('says when the last live update arrived', () => {
    render(
      <LiveIndicator live={{ status: 'live', lastEventAt: new Date() }} />,
    );

    expect(screen.getByText('· Updated just now')).toBeInTheDocument();
  });

  it('keeps reading Live through a drop shorter than a second', () => {
    vi.useFakeTimers();
    const { rerender } = render(
      <LiveIndicator live={{ status: 'live', lastEventAt: null }} />,
    );

    rerender(<LiveIndicator live={{ status: 'offline', lastEventAt: null }} />);
    expect(screen.getByRole('status')).toHaveTextContent('Live');

    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByRole('status')).toHaveTextContent('Offline');
  });
});

describe('OfflineBanner', () => {
  it.each(['connecting', 'live'] as const)(
    'stays hidden while %s',
    (status) => {
      const { container } = render(<OfflineBanner status={status} />);
      expect(container).toBeEmptyDOMElement();
    },
  );

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
