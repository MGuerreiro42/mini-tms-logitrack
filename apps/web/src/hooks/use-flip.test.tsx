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

  it('starts the slide from the layout position, whatever the scroll or a running slide', () => {
    reducedMotion(false);
    const { container, rerender } = render(<Marks group="IN_TRANSIT" />);
    const mark = container.querySelector<HTMLElement>('[data-flip-id="a"]');
    if (!mark) throw new Error('mark missing');
    const place = (left: number, top: number, rectLeft: number) => {
      Object.defineProperty(mark, 'offsetLeft', {
        value: left,
        configurable: true,
      });
      Object.defineProperty(mark, 'offsetTop', {
        value: top,
        configurable: true,
      });
      mark.getBoundingClientRect = () =>
        ({ left: rectLeft, top: rectLeft }) as DOMRect;
    };
    place(100, 40, 100);
    rerender(<Marks group="IN_TRANSIT" />);

    place(10, 40, -300);
    rerender(<Marks group="OUT_FOR_DELIVERY" />);

    expect(animate.mock.calls[0][0][0].transform).toBe('translate(90px, 0px)');
  });

  it('moves the mark without a tween under reduced motion', () => {
    reducedMotion(true);
    const { rerender } = render(<Marks group="IN_TRANSIT" />);

    rerender(<Marks group="OUT_FOR_DELIVERY" />);

    expect(animate).not.toHaveBeenCalled();
  });
});
