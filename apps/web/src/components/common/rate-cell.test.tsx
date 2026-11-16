import { render, screen } from '@testing-library/react';
import { RateCell } from './rate-cell';

describe('RateCell', () => {
  it('shows a rate from five samples up', () => {
    render(<RateCell rate={92.31} n={13} />);

    expect(screen.getByText('92.3%')).toBeVisible();
  });

  it.each([
    [100, 4],
    [null, 0],
  ])(
    'reads "—" for rate %s on n=%s, naming the sample to every reader',
    (rate, n) => {
      render(<RateCell rate={rate} n={n} />);

      const note = `Not enough deliveries (n=${n})`;
      expect(screen.getByText('—')).toHaveAttribute('aria-hidden');
      expect(screen.getByText(note)).toHaveClass('sr-only');
      expect(screen.getByTitle(note)).toBeInTheDocument();
    },
  );
});
