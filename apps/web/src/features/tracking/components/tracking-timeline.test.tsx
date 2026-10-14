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
            status: 'ACCEPTED',
            note: null,
            createdAt: '2026-01-01T12:00:00.000Z',
          },
          {
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

  it('renders each timestamp as a machine-readable time element', () => {
    render(
      <TrackingTimeline
        events={[
          {
            status: 'ACCEPTED',
            note: null,
            createdAt: '2026-01-01T12:00:00.000Z',
          },
        ]}
      />,
    );

    const time = screen.getByText('Jan 1, 2026, 09:00 GMT-3');
    expect(time.tagName).toBe('TIME');
    expect(time).toHaveAttribute('datetime', '2026-01-01T12:00:00.000Z');
  });

  const events = [
    { status: 'PENDING', createdAt: '2026-01-01T12:00:00.000Z' },
    { status: 'ACCEPTED', createdAt: '2026-01-02T12:00:00.000Z' },
  ] as const;

  it('lists the newest event first, under the next expected step', () => {
    render(<TrackingTimeline events={[...events]} status="ACCEPTED" />);
    const items = screen.getAllByRole('listitem');

    expect(items.map((item) => item.textContent)).toEqual([
      expect.stringContaining('Next expected: Collected'),
      expect.stringContaining('Accepted'),
      expect.stringContaining('Pending'),
    ]);
  });

  it('expects nothing more once the shipment is closed', () => {
    render(
      <TrackingTimeline
        events={[
          ...events,
          { status: 'CANCELLED', createdAt: '2026-01-03T12:00:00.000Z' },
        ]}
        status="CANCELLED"
      />,
    );

    expect(screen.queryByText(/next expected/i)).toBeNull();
  });
});
