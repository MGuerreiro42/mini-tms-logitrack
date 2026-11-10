import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

  it('is a link to its filtered list only when given an href, named with its target', () => {
    const { getByRole, queryByRole, rerender } = render(
      <StatTile label="On time" value="98%" />,
    );
    expect(queryByRole('link')).toBeNull();

    rerender(
      <StatTile
        label="Late now"
        value={1}
        href="/seller/shipments?view=late"
        linkLabel="View late shipments"
      />,
    );

    expect(
      getByRole('link', { name: 'Late now, 1. View late shipments' }),
    ).toHaveAttribute('href', '/seller/shipments?view=late');
  });

  it('opens its definition from the keyboard, beside the link rather than inside it', async () => {
    const user = userEvent.setup();
    const { getByRole, findByText } = render(
      <StatTile
        label="On time"
        scope="30 d"
        value="92.0%"
        href="/x"
        definition="Delivered by the due time, n=40."
      />,
    );

    expect(
      getByRole('link', { name: 'On time 30 d, 92.0%' }).contains(
        getByRole('button'),
      ),
    ).toBe(false);
    await user.tab();
    await user.tab();
    await user.keyboard('{Enter}');

    expect(await findByText('Delivered by the due time, n=40.')).toBeVisible();
    expect(getByRole('dialog', { name: 'On time definition' })).toBeVisible();
    await user.keyboard('{Escape}');
    expect(getByRole('button', { name: 'About On time' })).toHaveFocus();
  });

  it('colours the value with its tone, not the card', () => {
    const { getByText, container } = render(
      <StatTile label="Late now" value={3} tone="critical" note="oldest 2 h" />,
    );

    expect(getByText('3').parentElement).toHaveClass('text-destructive');
    expect(container.firstChild).not.toHaveClass('text-destructive');
    expect(getByText('oldest 2 h')).toHaveClass('text-muted-foreground');
  });
});
