import { render, screen } from '@testing-library/react';
import { StepIndicator } from './step-indicator';

describe('StepIndicator', () => {
  it('marks the current step and announces the finished ones', () => {
    render(
      <StepIndicator
        steps={[
          { label: 'Destination' },
          { label: 'Carrier' },
          { label: 'Review' },
        ]}
        current={1}
      />,
    );

    const steps = screen.getAllByRole('listitem');
    expect(steps[0]).toHaveTextContent('Done: Destination');
    expect(steps[1]).toHaveAttribute('aria-current', 'step');
    expect(steps[2]).not.toHaveAttribute('aria-current');
  });
});
