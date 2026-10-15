import { render, screen, within } from '@testing-library/react';
import { ShipmentStepper } from './shipment-stepper';

function desktopSteps() {
  return within(
    screen.getByRole('list', { name: 'Shipment progress' }),
  ).getAllByRole('listitem');
}

describe('ShipmentStepper', () => {
  it('marks earlier steps done and the current one as the current step', () => {
    render(<ShipmentStepper status="IN_TRANSIT" />);
    const steps = desktopSteps();

    expect(steps).toHaveLength(6);
    expect(steps[2]).toHaveTextContent('Done: Collected');
    expect(steps[3]).toHaveAttribute('aria-current', 'step');
    expect(steps[4]).toHaveTextContent('Upcoming: Out for delivery');
    expect(screen.getByText('Step 4 of 6')).toBeInTheDocument();
  });

  it('shows a delivered shipment as fully done with nothing in progress', () => {
    render(<ShipmentStepper status="DELIVERED" />);

    for (const step of desktopSteps()) {
      expect(step).not.toHaveAttribute('aria-current');
      expect(step).toHaveTextContent(/^Done:/);
    }
  });

  it('stops an off-path shipment at the last step it reached', () => {
    render(
      <ShipmentStepper
        status="CANCELLED"
        events={[
          { status: 'PENDING', createdAt: '2026-01-01T00:00:00.000Z' },
          { status: 'ACCEPTED', createdAt: '2026-01-01T01:00:00.000Z' },
          { status: 'CANCELLED', createdAt: '2026-01-01T02:00:00.000Z' },
        ]}
      />,
    );
    const steps = desktopSteps();

    expect(steps[1]).toHaveTextContent('Done: Accepted');
    expect(steps[2]).toHaveTextContent('Not reached: Collected');
    expect(screen.getByText('Cancelled')).toBeInTheDocument();
    expect(screen.getByText(/after accepted/)).toBeInTheDocument();
  });
});
