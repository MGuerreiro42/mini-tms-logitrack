import { render, screen } from '@testing-library/react';
import { TrackingTimeline } from './tracking-timeline';

describe('TrackingTimeline', () => {
  it('shows a placeholder message when there are no events', () => {
    render(<TrackingTimeline events={[]} />);

    expect(screen.getByText('No status updates yet.')).toBeInTheDocument();
  });

  it('renders one entry per event, with its note and status', () => {
    render(
      <TrackingTimeline
        events={[
          {
            id: 'event-1',
            status: 'ACCEPTED',
            note: null,
            createdAt: '2026-01-01T12:00:00.000Z',
          },
          {
            id: 'event-2',
            status: 'COLLECTED',
            note: 'Picked up from the seller',
            createdAt: '2026-01-02T12:00:00.000Z',
          },
        ]}
      />,
    );

    expect(screen.getByText('Accepted')).toBeInTheDocument();
    expect(screen.getByText('Collected')).toBeInTheDocument();
    expect(screen.getByText('Picked up from the seller')).toBeInTheDocument();
  });
});
