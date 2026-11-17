import { render, screen } from '@testing-library/react';
import { DeltaText } from './delta-text';

describe('DeltaText', () => {
  it.each([0, -0, 0.04, -0.04])('says no change for %s', (points) => {
    render(<DeltaText points={points} previous={88} />);

    expect(screen.getByText(/no change/)).toBeInTheDocument();
    expect(screen.queryByText(/[▲▼]/)).toBeNull();
    expect(screen.getByText('from 88.0%')).toBeInTheDocument();
  });

  it('shows the direction of a real change', () => {
    render(<DeltaText points={-2.5} previous={90} />);

    expect(screen.getByText('▼')).toBeInTheDocument();
    expect(screen.getByText('down from 90.0%')).toBeInTheDocument();
  });
});
