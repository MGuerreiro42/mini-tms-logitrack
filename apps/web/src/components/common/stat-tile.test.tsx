import { render } from '@testing-library/react';
import { StatTile } from './stat-tile';

const glowOf = (container: HTMLElement) =>
  container.querySelector('.animate-glow');

describe('StatTile', () => {
  it('does not glow on first render or when re-rendered with the same value', () => {
    const { container, rerender } = render(
      <StatTile label="Delivered" value={9} />,
    );

    rerender(<StatTile label="Delivered" value={9} />);

    expect(glowOf(container)).toBeNull();
  });

  it('glows once when its value changes, behind content hidden from assistive tech', () => {
    const { container, rerender, getByText } = render(
      <StatTile label="Delivered" value={9} />,
    );

    rerender(<StatTile label="Delivered" value={10} />);

    expect(glowOf(container)).toHaveAttribute('aria-hidden', 'true');
    expect(getByText('10')).toHaveClass('animate-value-in');
  });
});
