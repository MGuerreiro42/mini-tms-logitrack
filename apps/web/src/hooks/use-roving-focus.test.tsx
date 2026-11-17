import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRef } from 'react';
import { useRovingFocus } from './use-roving-focus';

function Items({ count }: { count: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const roving = useRovingFocus(ref, '[data-item]');
  return (
    <div ref={ref} {...roving}>
      {Array.from({ length: count }, (_, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: fixed list
        <a key={index} href={`#${index}`} data-item>
          {`item ${index}`}
        </a>
      ))}
    </div>
  );
}

describe('useRovingFocus', () => {
  it('keeps one tab stop and moves with the arrows, Home and End', async () => {
    const user = userEvent.setup();
    render(
      <>
        <button type="button">before</button>
        <Items count={3} />
        <button type="button">after</button>
      </>,
    );

    await user.tab();
    await user.tab();
    expect(screen.getByText('item 0')).toHaveFocus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByText('item 1')).toHaveFocus();
    await user.keyboard('{End}');
    expect(screen.getByText('item 2')).toHaveFocus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByText('item 2')).toHaveFocus();
    await user.keyboard('{Home}{ArrowDown}{ArrowUp}');
    expect(screen.getByText('item 0')).toHaveFocus();

    await user.keyboard('{ArrowRight}');
    await user.tab();
    expect(screen.getByText('after')).toHaveFocus();
    await user.tab({ shift: true });
    expect(screen.getByText('item 1')).toHaveFocus();
  });

  it('falls back to the first item when the remembered one is gone', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<Items count={3} />);
    await user.tab();
    await user.keyboard('{End}');

    rerender(<Items count={2} />);

    expect(screen.getByText('item 0')).toHaveAttribute('tabindex', '0');
    expect(screen.getByText('item 1')).toHaveAttribute('tabindex', '-1');
  });
});
