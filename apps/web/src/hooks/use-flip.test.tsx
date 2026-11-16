import { render } from '@testing-library/react';
import { useRef } from 'react';
import { useFlip } from './use-flip';

function Marks({ group }: { group: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useFlip(ref);
  return (
    <div ref={ref}>
      <div data-flip-id="a" data-flip-group={group} />
      <div data-flip-id="b" data-flip-group="still" />
    </div>
  );
}

const reducedMotion = (matches: boolean) =>
  vi.spyOn(window, 'matchMedia').mockReturnValue({
    matches,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  } as unknown as MediaQueryList);

describe('useFlip', () => {
  const animate = vi.fn();

  beforeEach(() => {
    animate.mockReset();
    HTMLElement.prototype.animate = animate;
  });

  it('slides only a mark that changed group, never on mount', () => {
    reducedMotion(false);
    const { rerender } = render(<Marks group="IN_TRANSIT" />);
    expect(animate).not.toHaveBeenCalled();

    rerender(<Marks group="IN_TRANSIT" />);
    expect(animate).not.toHaveBeenCalled();

    rerender(<Marks group="OUT_FOR_DELIVERY" />);
    expect(animate).toHaveBeenCalledTimes(1);
  });

  it('moves the mark without a tween under reduced motion', () => {
    reducedMotion(true);
    const { rerender } = render(<Marks group="IN_TRANSIT" />);

    rerender(<Marks group="OUT_FOR_DELIVERY" />);

    expect(animate).not.toHaveBeenCalled();
  });
});
