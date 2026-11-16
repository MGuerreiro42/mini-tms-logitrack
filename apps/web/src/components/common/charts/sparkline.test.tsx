import { render } from '@testing-library/react';
import { Sparkline } from './sparkline';

describe('Sparkline', () => {
  it('hides itself with fewer than 3 points carrying data', () => {
    const { container } = render(<Sparkline values={[80, null, 90, null]} />);

    expect(container.firstChild).toBeNull();
  });

  it('joins across empty buckets and draws the target dashed', () => {
    const { container } = render(
      <Sparkline values={[100, null, 50, 75]} target={90} />,
    );

    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden');
    expect(
      container.querySelector('polyline')?.getAttribute('points')?.split(' '),
    ).toHaveLength(3);
    expect(container.querySelector('line')).toHaveAttribute(
      'stroke-dasharray',
      '2 2',
    );
  });
});
