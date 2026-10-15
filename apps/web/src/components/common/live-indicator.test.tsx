import { render, screen } from '@testing-library/react';
import { useRealtimeStore } from '@/store/realtime-store';
import { LiveIndicator } from './live-indicator';

describe('LiveIndicator', () => {
  it('shows Live while the socket is connected', () => {
    useRealtimeStore.setState({ connected: true });
    render(<LiveIndicator />);
    expect(screen.getByRole('status')).toHaveTextContent('Live');
  });

  it('shows Reconnecting while the socket is down', () => {
    useRealtimeStore.setState({ connected: false });
    render(<LiveIndicator />);
    expect(screen.getByRole('status')).toHaveTextContent('Reconnecting…');
  });
});
